import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

const app = new Hono().basePath('/make-server-513143ac');

app.use('*', logger(console.log));
app.use("/*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization", "X-Service-Key"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
}));

// ==================== GUARDA DE LICENÇA (server-side) ====================
// Bloqueia o acesso aos dados quando não existe licença activa.
// Impede o bypass do gate do cliente (localStorage.systemActivated).
const normalisePath = (path: string) =>
  path
    .replace(/^\/functions\/v1\/make-server-513143ac/, '')
    .replace(/^\/make-server-513143ac/, '') || '/';

const LICENSE_EXEMPT = ['/health', '/license', '/me', '/signup', '/reset'];

const isLicenseExempt = (path: string) => {
  const p = normalisePath(path);
  return (
    LICENSE_EXEMPT.includes(p) ||
    p === '/activation-keys' ||
    p.startsWith('/activation-keys/')
  );
};

app.use('/*', async (c, next) => {
  if (c.req.method === 'OPTIONS' || isLicenseExempt(c.req.path)) {
    return next();
  }

  try {
    const license = await kv.get('license:active');
    if (!license) {
      return c.json({ error: 'license_invalid', message: 'Nenhuma licença activa.' }, 403);
    }
    if (license.expiresAt && new Date(license.expiresAt).getTime() <= Date.now()) {
      return c.json({ error: 'license_invalid', message: 'Licença expirada.' }, 403);
    }
  } catch (e) {
    console.warn('[LICENSE] Falha ao verificar licença:', e);
    return c.json({ error: 'license_check_failed' }, 503);
  }

  return next();
});

// ==================== PAPÉIS ====================
// admin      — gere financeiro, vê tudo o resto
// director   — gere utilizadores/alunos/turmas/disciplinas, vê financeiro, vê pedagógico
// pedagogico — vê tudo pedagógico, não edita nada
// professor  — lança notas e frequência só da sua turma e disciplina
// secretaria — vê financeiro apenas

const ROLES = {
  canManageFinancial:   ['admin'],
  canViewFinancial:     ['admin', 'secretaria'],
  canManageUsers:       ['admin', 'director'],
  canManageStudents:    ['admin', 'director'],
  canViewStudents:      ['admin', 'director', 'pedagogico', 'professor', 'secretaria'],
  canManageClasses:     ['admin', 'director'],
  canViewClasses:       ['admin', 'director', 'pedagogico', 'professor', 'secretaria'],
  canManageSubjects:    ['admin', 'director'],
  canViewSubjects:      ['admin', 'director', 'pedagogico', 'professor', 'secretaria'],
  canManageTeachers:    ['admin', 'director'],
  canViewTeachers:      ['admin', 'director', 'pedagogico'],
  canViewGrades:        ['admin', 'director', 'pedagogico', 'professor'],
  canViewAttendance:    ['admin', 'director', 'pedagogico', 'professor'],
};

const hasRole = (role: string, allowed: string[]) => allowed.includes(role);

// ==================== UTILITÁRIOS DE PEDIDO ====================

// deno-lint-ignore no-explicit-any
const getClientIp = (c: any): string => {
  const xff =
    c.req.header('x-forwarded-for') ||
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-real-ip') ||
    '';
  return String(xff).split(',')[0].trim() || 'unknown';
};

// Limite simples baseado em KV (por identificador)
const rateLimit = async (id: string, limit: number, windowSec: number): Promise<boolean> => {
  try {
    const key = `ratelimit:${id}`;
    const now = Date.now();
    const rec = await kv.get(key);
    if (!rec || now - rec.windowStart > windowSec * 1000) {
      await kv.set(key, { windowStart: now, count: 1 });
      return true;
    }
    if (rec.count >= limit) return false;
    await kv.set(key, { windowStart: rec.windowStart, count: rec.count + 1 });
    return true;
  } catch (e) {
    console.warn('[RATE-LIMIT] Falha ao verificar limite:', e);
    return true; // não bloquear em caso de falha do limiter
  }
};

// Resposta de erro genérica (não expõe detalhes internos)
// deno-lint-ignore no-explicit-any
const serverError = (c: any, error: unknown) => {
  console.error('[ERROR]', error);
  return c.json({ error: 'Erro interno do servidor' }, 500);
};

// ==================== AUTH HELPER ====================

const getAuthUser = async (authHeader: string | null) => {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const accessToken = authHeader.split(' ')[1];
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  if (error || !user) return null;
  return user;
};

const getProfile = async (userId: string) => {
  return await kv.get(`user:${userId}`);
};

// ==================== AUDIT LOG ====================

const auditLog = async (
  userId: string,
  userName: string,
  userRole: string,
  action: string,
  module: string,
  details: string,
  targetId?: string,
  ip?: string,
) => {
  try {
    const id = crypto.randomUUID();
    const entry = {
      id,
      userId,
      userName,
      userRole,
      action,      // 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'VIEW'
      module,      // 'students' | 'payments' | 'grades' | 'users' | 'auth' | etc
      details,     // descrição legível do que foi feito
      targetId,    // ID do registo afectado (opcional)
      timestamp: new Date().toISOString(),
      ip: ip || 'N/A',
    };
    await kv.set(`audit:${id}`, entry);

    // Manter lista dos últimos 1000 registos
    const list: string[] = await kv.get('audit:list') || [];
    list.push(id);
    if (list.length > 1000) list.splice(0, list.length - 1000);
    await kv.set('audit:list', list);
  } catch (e) {
    console.warn('[AUDIT] Erro ao registar:', e);
  }
};

// Gerar código único de acesso para professor
const generateAccessCode = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const counter = await kv.get('professor:counter') || 0;
  const newCounter = counter + 1;
  await kv.set('professor:counter', newCounter);
  return `PROF-${year}-${String(newCounter).padStart(3, '0')}`;
};

// ==================== HEALTH ====================

app.get("/health", (c) => c.json({ status: "ok" }));

// ==================== CHAVES DE ACTIVAÇÃO ====================

// Função para hash SHA-256 — compatível com Node.js crypto
const hashKey = async (key: string): Promise<string> => {
  const normalised = key.trim().toUpperCase();
  const encoder = new TextEncoder();
  const data = encoder.encode(normalised);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Tipos de chave suportados: prefixo, duração e tipo de licença
const KEY_TYPES: Record<string, { prefix: string; dias: number; tipo: string }> = {
  trial:      { prefix: 'FCLEID-X', dias: 30,  tipo: 'trial' },
  trimestral: { prefix: 'FCLEID-T', dias: 90,  tipo: 'trimestral' },
  annual:     { prefix: 'FCLEID-A', dias: 365, tipo: 'anual' },
  anual:      { prefix: 'FCLEID-A', dias: 365, tipo: 'anual' },
};

const generateActivationKey = (type: string): string => {
  const cfg = KEY_TYPES[type] || KEY_TYPES.annual;
  const raw = Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
  return `${cfg.prefix}-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`;
};

// Lista (de hashes) das chaves de activação — mantida pelo servidor
const getActivationList = async (): Promise<string[]> => (await kv.get('activation:list')) || [];

const addToActivationList = async (hash: string) => {
  const list = await getActivationList();
  if (!list.includes(hash)) {
    list.push(hash);
    await kv.set('activation:list', list);
  }
};

const removeFromActivationList = async (hash: string) => {
  const list = await getActivationList();
  await kv.set('activation:list', list.filter((h) => h !== hash));
};

// Autorização de gestão de chaves: service key (dev tools) OU admin/director autenticado
// deno-lint-ignore no-explicit-any
const isManagementAuthorised = async (c: any): Promise<boolean> => {
  const serviceKey = c.req.header('X-Service-Key');
  if (serviceKey && serviceKey === Deno.env.get('SERVICE_MANAGEMENT_KEY')) return true;

  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const user = await getAuthUser(authHeader);
    if (user) {
      const profile = await getProfile(user.id);
      if (profile && hasRole(profile.role, ['admin', 'director'])) return true;
    }
  }
  return false;
};

// Registar/gerar chave de activação (service key ou admin/director)
app.post("/activation-keys", async (c) => {
  try {
    if (!(await isManagementAuthorised(c))) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const body = await c.req.json().catch(() => ({}));

    // ── Legado: o developer envia keyHash + (opcional) key + school (+ tipo/expiresAt)
    if (body.keyHash) {
      if (!body.school) return c.json({ error: 'school é obrigatório' }, 400);
      const record = {
        key: body.key || null,
        type: body.type || (body.tipo === 'trial' ? 'trial' : 'annual'),
        tipo: body.tipo || (body.type === 'trial' ? 'trial' : 'anual'),
        school: body.school,
        expiresAt: body.expiresAt || null,
        used: false,
        createdAt: new Date().toISOString(),
      };
      await kv.set(`activation:${body.keyHash}`, record);
      await addToActivationList(body.keyHash);
      return c.json({ success: true, key: { ...record, hash: body.keyHash } });
    }

    // ── Geração pelo servidor (app / dev-panel)
    const type = String(body.type || 'annual');
    const school = body.school;
    if (!school) return c.json({ error: 'school é obrigatório' }, 400);

    const cfg = KEY_TYPES[type] || KEY_TYPES.annual;
    const key = generateActivationKey(type);
    const keyHash = await hashKey(key);

    let expiresAt = body.expiresAt || null;
    if (!expiresAt) {
      const d = new Date();
      d.setDate(d.getDate() + cfg.dias);
      expiresAt = d.toISOString();
    }

    const record = {
      key,
      type: type === 'trial' ? 'trial' : 'annual',
      tipo: cfg.tipo,
      school,
      expiresAt,
      used: false,
      createdAt: new Date().toISOString(),
      createdBy: body.createdBy || 'developer',
    };

    await kv.set(`activation:${keyHash}`, record);
    await addToActivationList(keyHash);

    return c.json({ success: true, key: { ...record, hash: keyHash } });
  } catch (error) {
    return serverError(c, error);
  }
});

// Listar chaves de activação (service key ou admin/director)
app.get("/activation-keys", async (c) => {
  try {
    if (!(await isManagementAuthorised(c))) {
      return c.json({ error: 'Não autorizado' }, 401);
    }
    const list = await getActivationList();
    const records = await kv.mget(list.map((h) => `activation:${h}`));
    const keys = records
      // deno-lint-ignore no-explicit-any
      .map((r: any, i: number) => (r ? { ...r, hash: list[i] } : null))
      .filter(Boolean);
    return c.json({ keys });
  } catch (error) {
    return serverError(c, error);
  }
});

// Eliminar chave de activação (service key ou admin/director) — aceita a chave (plaintext) ou o hash
app.delete("/activation-keys/:id", async (c) => {
  try {
    if (!(await isManagementAuthorised(c))) {
      return c.json({ error: 'Não autorizado' }, 401);
    }
    const id = c.req.param('id');
    const hash = /^[a-f0-9]{64}$/i.test(id) ? id.toLowerCase() : await hashKey(id);
    await kv.del(`activation:${hash}`);
    await removeFromActivationList(hash);
    return c.json({ success: true });
  } catch (error) {
    return serverError(c, error);
  }
});

// Verificar se chave é válida (público — usado no Activate)
app.post("/activation-keys/verify", async (c) => {
  try {
    if (!(await rateLimit(`verify:${getClientIp(c)}`, 20, 600))) {
      return c.json({ valid: false, error: 'Demasiadas tentativas. Tenta novamente mais tarde.' }, 429);
    }
    const { activationKey } = await c.req.json();
    const cleanKey = typeof activationKey === 'string' ? activationKey.trim() : '';
    if (!cleanKey) return c.json({ valid: false, error: 'Chave em falta' }, 400);

    const keyHash = await hashKey(cleanKey);
    const keyData = await kv.get(`activation:${keyHash}`);

    if (!keyData) return c.json({ valid: false, error: 'Chave inválida' }, 400);
    if (keyData.used) return c.json({ valid: false, error: 'Chave já utilizada' }, 400);

    // Verificar expiração
    if (keyData.expiresAt && new Date(keyData.expiresAt) < new Date()) {
      return c.json({ valid: false, error: 'Chave expirada' }, 400);
    }

    // NÃO marca como usada aqui — só valida
    // A marcação acontece no /activation-keys/activate
    return c.json({ valid: true, school: keyData.school });
  } catch (error) {
    return serverError(c, error);
  }
});

// Activar o sistema com a chave (marca como usada e guarda licença)
app.post("/activation-keys/activate", async (c) => {
  try {
    if (!(await rateLimit(`activate:${getClientIp(c)}`, 10, 600))) {
      return c.json({ success: false, error: 'Demasiadas tentativas. Tenta novamente mais tarde.' }, 429);
    }
    const { activationKey } = await c.req.json();
    const cleanKey = typeof activationKey === 'string' ? activationKey.trim() : '';
    if (!cleanKey) return c.json({ success: false, error: 'Chave em falta' }, 400);

    const keyHash = await hashKey(cleanKey);
    const keyData = await kv.get(`activation:${keyHash}`);

    if (!keyData) return c.json({ success: false, error: 'Chave inválida' }, 400);
    if (keyData.used) return c.json({ success: false, error: 'Chave já utilizada' }, 400);
    if (keyData.expiresAt && new Date(keyData.expiresAt) < new Date()) {
      return c.json({ success: false, error: 'Chave expirada' }, 400);
    }

    // Marcar chave como usada e guardar licença activa
    await kv.set(`activation:${keyHash}`, { ...keyData, used: true, usedAt: new Date().toISOString() });
    await kv.set('license:active', {
      school: keyData.school,
      tipo: keyData.tipo || 'anual',
      expiresAt: keyData.expiresAt,
      activatedAt: new Date().toISOString(),
    });

    return c.json({ success: true, school: keyData.school });
  } catch (error) {
    return serverError(c, error);
  }
});

// Estado actual da licença (público — não requer autenticação)
app.get("/license", async (c) => {
  try {
    const licenseData = await kv.get('license:active');

    if (!licenseData) {
      return c.json({
        status: 'no_license',
        message: 'Nenhuma licença activa',
        daysLeft: 0,
        expired: true,
      });
    }

    const now = new Date();
    const expiresAt = new Date(licenseData.expiresAt);
    const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const expired = daysLeft <= 0;

    let status = 'active';
    if (expired) status = 'expired';
    else if (daysLeft <= 7) status = 'expiring_soon';
    else if (daysLeft <= 30) status = 'expiring';

    return c.json({
      status,
      school: licenseData.school,
      tipo: licenseData.tipo,
      expiresAt: licenseData.expiresAt,
      daysLeft: Math.max(0, daysLeft),
      expired,
    });
  } catch (error) {
    return serverError(c, error);
  }
});

// ==================== AUTH ====================

app.post("/signup", async (c) => {
  try {
    if (!(await rateLimit(`signup:${getClientIp(c)}`, 10, 600))) {
      return c.json({ error: 'Demasiadas tentativas. Tenta novamente mais tarde.' }, 429);
    }
    const { email, password, name, role, activationKey } = await c.req.json();
    if (!email || !password || !name || !role) {
      return c.json({ error: 'Campos obrigatórios em falta' }, 400);
    }

    const validRoles = ['admin', 'director', 'pedagogico', 'professor', 'secretaria', 'encarregado'];
    if (!validRoles.includes(role)) {
      return c.json({ error: 'Papel inválido' }, 400);
    }

    // ── Verificar se já existem utilizadores (primeiro setup)
    const usersList = await kv.get('users:list') || [];
    const isFirstUser = usersList.length === 0;

    // ── Se for o primeiro utilizador, verificar se o sistema foi activado
    if (isFirstUser) {
      const license = await kv.get('license:active');
      if (!license) {
        // Fallback: aceitar activationKey directamente no signup (compatibilidade)
        if (typeof activationKey === 'string' && activationKey.trim()) {
          const keyHash = await hashKey(activationKey.trim());
          const keyData = await kv.get(`activation:${keyHash}`);
          if (!keyData) return c.json({ error: 'Chave de activação inválida' }, 400);
          if (keyData.used) return c.json({ error: 'Chave de activação já utilizada' }, 400);
          if (keyData.expiresAt && new Date(keyData.expiresAt) < new Date()) {
            return c.json({ error: 'Chave de activação expirada' }, 400);
          }
          await kv.set(`activation:${keyHash}`, { ...keyData, used: true, usedAt: new Date().toISOString(), usedBy: email });
          await kv.set('license:active', {
            school: keyData.school,
            tipo: keyData.tipo || 'anual',
            expiresAt: keyData.expiresAt,
            activatedAt: new Date().toISOString(),
            activatedBy: email,
          });
        } else {
          return c.json({ error: 'Sistema não activado. Activa o sistema primeiro em /activate' }, 400);
        }
      }
      // Se licença activa existe — deixa criar o primeiro admin sem chave
    }

    // ── Utilizadores seguintes precisam de estar autenticados como admin/director
    if (!isFirstUser) {
      const authUser = await getAuthUser(c.req.header('Authorization'));
      if (!authUser) return c.json({ error: 'Não autorizado' }, 401);
      const profile = await getProfile(authUser.id);
      if (!profile || !['admin', 'director'].includes(profile.role)) {
        return c.json({ error: 'Sem permissão para criar utilizadores' }, 403);
      }
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data, error } = await supabase.auth.admin.createUser({
      email, password,
      user_metadata: { name, role },
      email_confirm: true,
    });
    if (error) return c.json({ error: error.message }, 400);

    const profile: any = {
      id: data.user.id, email, name, role,
      createdAt: new Date().toISOString(),
    };

    if (role === 'professor') {
      profile.accessCode = await generateAccessCode();
      profile.assignedClasses = [];
      profile.assignedSubjects = [];
    }

    if (role === 'encarregado') {
      profile.studentIds = [];
    }

    await kv.set(`user:${data.user.id}`, profile);
    usersList.push(data.user.id);
    await kv.set('users:list', usersList);

    await auditLog(data.user.id, name, role, 'CREATE', 'users', `Nova conta criada: ${name} (${role}) — ${email}`, undefined, getClientIp(c));

    return c.json({ success: true, user: profile });
  } catch (error) {
    return serverError(c, error);
  }
});

app.get("/me", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const profile = await getProfile(user.id);
    // ── Audit: Login (quando /me é chamado após login)
    if (profile) {
      await auditLog(profile.id, profile.name, profile.role, 'LOGIN', 'auth', `Sessão iniciada por ${profile.name} (${profile.role})`, undefined, getClientIp(c));
    }
    return c.json({ user: profile || user });
  } catch (error) {
    return serverError(c, error);
  }
});

// ==================== UTILIZADORES ====================

// Listar todos os utilizadores (admin e director)
app.get("/users", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const profile = await getProfile(user.id);
    if (!profile || !hasRole(profile.role, ROLES.canManageUsers)) {
      return c.json({ error: 'Sem permissão' }, 403);
    }
    const usersList = await kv.get('users:list') || [];
    const users = await kv.mget(usersList.map((id: string) => `user:${id}`));
    return c.json({ users: users.filter(Boolean) });
  } catch (error) {
    return serverError(c, error);
  }
});

// Actualizar utilizador (atribuir turmas/disciplinas ao professor)
app.put("/users/:id", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const profile = await getProfile(user.id);
    if (!profile || !hasRole(profile.role, ROLES.canManageUsers)) {
      return c.json({ error: 'Sem permissão' }, 403);
    }
    const id = c.req.param('id');
    const existing = await kv.get(`user:${id}`);
    if (!existing) return c.json({ error: 'Utilizador não encontrado' }, 404);

    // Protecção de privilégios: só o admin altera admins
    if (profile.role !== 'admin' && existing.role === 'admin') {
      return c.json({ error: 'Só o administrador pode alterar um administrador' }, 403);
    }

    const updates = await c.req.json();

    // Só o admin altera o papel; validar o valor
    if (updates.role !== undefined) {
      if (profile.role !== 'admin') {
        return c.json({ error: 'Apenas o administrador pode alterar papéis' }, 403);
      }
      const validRoles = ['admin', 'director', 'pedagogico', 'professor', 'secretaria', 'encarregado'];
      if (!validRoles.includes(updates.role)) {
        return c.json({ error: 'Papel inválido' }, 400);
      }
    }

    // Whitelist de campos editáveis (evita mass assignment)
    const editableFields = ['name', 'email', 'role', 'accessCode', 'assignedClasses', 'assignedSubjects', 'studentIds', 'active'];
    const safeUpdates: Record<string, unknown> = {};
    for (const f of editableFields) {
      if (f in updates) safeUpdates[f] = updates[f];
    }

    const updated = { ...existing, ...safeUpdates, id, updatedAt: new Date().toISOString() };
    await kv.set(`user:${id}`, updated);
    return c.json({ success: true, user: updated });
  } catch (error) {
    return serverError(c, error);
  }
});

// Apagar utilizador
app.delete("/users/:id", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const profile = await getProfile(user.id);
    if (!profile || !hasRole(profile.role, ROLES.canManageUsers)) {
      return c.json({ error: 'Sem permissão' }, 403);
    }
    const id = c.req.param('id');
    const target = await kv.get(`user:${id}`);
    if (profile.id === id) {
      return c.json({ error: 'Não podes remover a tua própria conta' }, 400);
    }
    // Protecção de privilégios: só o admin remove admins
    if (target && target.role === 'admin' && profile.role !== 'admin') {
      return c.json({ error: 'Só o administrador pode remover um administrador' }, 403);
    }
    await kv.del(`user:${id}`);
    const usersList = await kv.get('users:list') || [];
    await kv.set('users:list', usersList.filter((uid: string) => uid !== id));
    return c.json({ success: true });
  } catch (error) {
    return serverError(c, error);
  }
});

// ==================== ALUNOS ====================

app.post("/students", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const profile = await getProfile(user.id);
    if (!profile || !hasRole(profile.role, ROLES.canManageStudents)) {
      return c.json({ error: 'Sem permissão' }, 403);
    }
    const student = await c.req.json();
    const id = crypto.randomUUID();
    const newStudent = { ...student, id, createdAt: new Date().toISOString() };
    await kv.set(`student:${id}`, newStudent);
    const list = await kv.get('students:list') || [];
    list.push(id);
    await kv.set('students:list', list);
    // ── Audit
    await auditLog(profile.id, profile.name, profile.role, 'CREATE', 'students', `Aluno criado: ${student.name}`, id, getClientIp(c));
    return c.json({ success: true, student: newStudent });
  } catch (error) {
    return serverError(c, error);
  }
});

app.get("/students", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const profile = await getProfile(user.id);
    if (!profile || !hasRole(profile.role, ROLES.canViewStudents)) {
      return c.json({ error: 'Sem permissão' }, 403);
    }
    const list = await kv.get('students:list') || [];
    let students = await kv.mget(list.map((id: string) => `student:${id}`));
    students = students.filter(Boolean);

    // Professor só vê alunos das suas turmas
    if (profile.role === 'professor') {
      const assignedClasses = profile.assignedClasses || [];
      students = students.filter((s: any) => assignedClasses.includes(s.classId));
    }

    return c.json({ students });
  } catch (error) {
    return serverError(c, error);
  }
});

app.get("/students/:id", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const profile = await getProfile(user.id);
    if (!profile || !hasRole(profile.role, ROLES.canViewStudents)) {
      return c.json({ error: 'Sem permissão' }, 403);
    }
    const student = await kv.get(`student:${c.req.param('id')}`);
    if (!student) return c.json({ error: 'Não encontrado' }, 404);

    // Professor só vê alunos das suas turmas
    if (profile.role === 'professor') {
      const assignedClasses = profile.assignedClasses || [];
      if (!assignedClasses.includes(student.classId)) {
        return c.json({ error: 'Sem permissão' }, 403);
      }
    }

    return c.json({ student });
  } catch (error) {
    return serverError(c, error);
  }
});

app.put("/students/:id", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const profile = await getProfile(user.id);
    if (!profile || !hasRole(profile.role, ROLES.canManageStudents)) {
      return c.json({ error: 'Sem permissão' }, 403);
    }
    const id = c.req.param('id');
    const existing = await kv.get(`student:${id}`);
    if (!existing) return c.json({ error: 'Não encontrado' }, 404);
    const updated = { ...existing, ...await c.req.json(), id, updatedAt: new Date().toISOString() };
    await kv.set(`student:${id}`, updated);
    return c.json({ success: true, student: updated });
  } catch (error) {
    return serverError(c, error);
  }
});

app.delete("/students/:id", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const profile = await getProfile(user.id);
    if (!profile || !hasRole(profile.role, ROLES.canManageStudents)) {
      return c.json({ error: 'Sem permissão' }, 403);
    }
    const id = c.req.param('id');
    await kv.del(`student:${id}`);
    const list = await kv.get('students:list') || [];
    await kv.set('students:list', list.filter((sid: string) => sid !== id));
    return c.json({ success: true });
  } catch (error) {
    return serverError(c, error);
  }
});

// ==================== PROFESSORES ====================

app.post("/teachers", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const profile = await getProfile(user.id);
    if (!profile || !hasRole(profile.role, ROLES.canManageTeachers)) {
      return c.json({ error: 'Sem permissão' }, 403);
    }
    const teacher = await c.req.json();
    const id = crypto.randomUUID();
    const newTeacher = { ...teacher, id, createdAt: new Date().toISOString() };
    await kv.set(`teacher:${id}`, newTeacher);
    const list = await kv.get('teachers:list') || [];
    list.push(id);
    await kv.set('teachers:list', list);
    return c.json({ success: true, teacher: newTeacher });
  } catch (error) {
    return serverError(c, error);
  }
});

app.get("/teachers", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const profile = await getProfile(user.id);
    if (!profile || !hasRole(profile.role, ROLES.canViewTeachers)) {
      return c.json({ error: 'Sem permissão' }, 403);
    }
    const list = await kv.get('teachers:list') || [];
    const teachers = await kv.mget(list.map((id: string) => `teacher:${id}`));
    return c.json({ teachers: teachers.filter(Boolean) });
  } catch (error) {
    return serverError(c, error);
  }
});

app.put("/teachers/:id", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const profile = await getProfile(user.id);
    if (!profile || !hasRole(profile.role, ROLES.canManageTeachers)) {
      return c.json({ error: 'Sem permissão' }, 403);
    }
    const id = c.req.param('id');
    const existing = await kv.get(`teacher:${id}`);
    if (!existing) return c.json({ error: 'Não encontrado' }, 404);
    const updated = { ...existing, ...await c.req.json(), id, updatedAt: new Date().toISOString() };
    await kv.set(`teacher:${id}`, updated);
    return c.json({ success: true, teacher: updated });
  } catch (error) {
    return serverError(c, error);
  }
});

app.delete("/teachers/:id", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const profile = await getProfile(user.id);
    if (!profile || !hasRole(profile.role, ROLES.canManageTeachers)) {
      return c.json({ error: 'Sem permissão' }, 403);
    }
    const id = c.req.param('id');
    await kv.del(`teacher:${id}`);
    const list = await kv.get('teachers:list') || [];
    await kv.set('teachers:list', list.filter((tid: string) => tid !== id));
    return c.json({ success: true });
  } catch (error) {
    return serverError(c, error);
  }
});

// ==================== TURMAS ====================

app.post("/classes", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const profile = await getProfile(user.id);
    if (!profile || !hasRole(profile.role, ROLES.canManageClasses)) {
      return c.json({ error: 'Sem permissão' }, 403);
    }
    const classData = await c.req.json();
    const id = crypto.randomUUID();
    const newClass = { ...classData, id, createdAt: new Date().toISOString() };
    await kv.set(`class:${id}`, newClass);
    const list = await kv.get('classes:list') || [];
    list.push(id);
    await kv.set('classes:list', list);
    return c.json({ success: true, class: newClass });
  } catch (error) {
    return serverError(c, error);
  }
});

app.get("/classes", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const profile = await getProfile(user.id);
    if (!profile || !hasRole(profile.role, ROLES.canViewClasses)) {
      return c.json({ error: 'Sem permissão' }, 403);
    }
    const list = await kv.get('classes:list') || [];
    let classes = await kv.mget(list.map((id: string) => `class:${id}`));
    classes = classes.filter(Boolean);

    // Professor só vê as suas turmas
    if (profile.role === 'professor') {
      const assignedClasses = profile.assignedClasses || [];
      classes = classes.filter((c: any) => assignedClasses.includes(c.id));
    }

    return c.json({ classes });
  } catch (error) {
    return serverError(c, error);
  }
});

app.put("/classes/:id", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const profile = await getProfile(user.id);
    if (!profile || !hasRole(profile.role, ROLES.canManageClasses)) {
      return c.json({ error: 'Sem permissão' }, 403);
    }
    const id = c.req.param('id');
    const existing = await kv.get(`class:${id}`);
    if (!existing) return c.json({ error: 'Não encontrado' }, 404);
    const updated = { ...existing, ...await c.req.json(), id, updatedAt: new Date().toISOString() };
    await kv.set(`class:${id}`, updated);
    return c.json({ success: true, class: updated });
  } catch (error) {
    return serverError(c, error);
  }
});

app.delete("/classes/:id", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const profile = await getProfile(user.id);
    if (!profile || !hasRole(profile.role, ROLES.canManageClasses)) {
      return c.json({ error: 'Sem permissão' }, 403);
    }
    const id = c.req.param('id');
    await kv.del(`class:${id}`);
    const list = await kv.get('classes:list') || [];
    await kv.set('classes:list', list.filter((cid: string) => cid !== id));
    return c.json({ success: true });
  } catch (error) {
    return serverError(c, error);
  }
});

// ==================== DISCIPLINAS ====================

app.post("/subjects", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const profile = await getProfile(user.id);
    if (!profile || !hasRole(profile.role, ROLES.canManageSubjects)) {
      return c.json({ error: 'Sem permissão' }, 403);
    }
    const subject = await c.req.json();
    const id = crypto.randomUUID();
    const newSubject = { ...subject, id, createdAt: new Date().toISOString() };
    await kv.set(`subject:${id}`, newSubject);
    const list = await kv.get('subjects:list') || [];
    list.push(id);
    await kv.set('subjects:list', list);
    return c.json({ success: true, subject: newSubject });
  } catch (error) {
    return serverError(c, error);
  }
});

app.get("/subjects", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const profile = await getProfile(user.id);
    if (!profile || !hasRole(profile.role, ROLES.canViewSubjects)) {
      return c.json({ error: 'Sem permissão' }, 403);
    }
    const list = await kv.get('subjects:list') || [];
    let subjects = await kv.mget(list.map((id: string) => `subject:${id}`));
    subjects = subjects.filter(Boolean);

    // Professor só vê as suas disciplinas
    if (profile.role === 'professor') {
      const assignedSubjects = profile.assignedSubjects || [];
      subjects = subjects.filter((s: any) => assignedSubjects.includes(s.id));
    }

    return c.json({ subjects });
  } catch (error) {
    return serverError(c, error);
  }
});

app.put("/subjects/:id", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const profile = await getProfile(user.id);
    if (!profile || !hasRole(profile.role, ROLES.canManageSubjects)) {
      return c.json({ error: 'Sem permissão' }, 403);
    }
    const id = c.req.param('id');
    const existing = await kv.get(`subject:${id}`);
    if (!existing) return c.json({ error: 'Não encontrado' }, 404);
    const updated = { ...existing, ...await c.req.json(), id, updatedAt: new Date().toISOString() };
    await kv.set(`subject:${id}`, updated);
    return c.json({ success: true, subject: updated });
  } catch (error) {
    return serverError(c, error);
  }
});

app.delete("/subjects/:id", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const profile = await getProfile(user.id);
    if (!profile || !hasRole(profile.role, ROLES.canManageSubjects)) {
      return c.json({ error: 'Sem permissão' }, 403);
    }
    const id = c.req.param('id');
    await kv.del(`subject:${id}`);
    const list = await kv.get('subjects:list') || [];
    await kv.set('subjects:list', list.filter((sid: string) => sid !== id));
    return c.json({ success: true });
  } catch (error) {
    return serverError(c, error);
  }
});

// ==================== NOTAS ====================

// Listar todas as notas (filtra por professor nas disciplinas atribuídas)
app.get("/grades", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const profile = await getProfile(user.id);
    if (!profile || !hasRole(profile.role, ROLES.canViewGrades)) {
      return c.json({ error: 'Sem permissão' }, 403);
    }
    const gradesData = await kv.getByPrefix('grade:');
    let grades = gradesData;

    // Professor só vê notas das suas disciplinas
    if (profile.role === 'professor') {
      const assignedSubjects = profile.assignedSubjects || [];
      grades = grades.filter((g: any) => assignedSubjects.includes(g.subjectId));
    }

    return c.json({ grades });
  } catch (error) {
    return serverError(c, error);
  }
});

app.post("/grades", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const profile = await getProfile(user.id);
    if (!profile || profile.role !== 'professor') {
      return c.json({ error: 'Apenas professores podem lançar notas' }, 403);
    }
    const { studentId, subjectId, classId, bimester, grade } = await c.req.json();

    // Verificar se o professor tem acesso a esta turma e disciplina
    const assignedClasses = profile.assignedClasses || [];
    const assignedSubjects = profile.assignedSubjects || [];
    if (!assignedClasses.includes(classId) || !assignedSubjects.includes(subjectId)) {
      return c.json({ error: 'Sem permissão para esta turma ou disciplina' }, 403);
    }

    const gradeKey = `grade:${studentId}:${subjectId}:${classId}:${bimester}`;
    const gradeRecord = {
      studentId, subjectId, classId, bimester, grade,
      teacherId: profile.id,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(gradeKey, gradeRecord);
    return c.json({ success: true, grade: gradeRecord });
  } catch (error) {
    return serverError(c, error);
  }
});

// Apagar uma nota (professor — apenas nas suas disciplinas)
app.delete("/grades", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const profile = await getProfile(user.id);
    if (!profile || profile.role !== 'professor') {
      return c.json({ error: 'Apenas professores podem remover notas' }, 403);
    }
    const { studentId, subjectId, classId, bimester } = await c.req.json();
    if (!studentId || !subjectId || !classId || !bimester) {
      return c.json({ error: 'Dados incompletos' }, 400);
    }

    const assignedClasses = profile.assignedClasses || [];
    const assignedSubjects = profile.assignedSubjects || [];
    if (!assignedClasses.includes(classId) || !assignedSubjects.includes(subjectId)) {
      return c.json({ error: 'Sem permissão para esta turma ou disciplina' }, 403);
    }

    const gradeKey = `grade:${studentId}:${subjectId}:${classId}:${bimester}`;
    await kv.del(gradeKey);
    return c.json({ success: true });
  } catch (error) {
    return serverError(c, error);
  }
});

app.get("/grades/student/:studentId", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const profile = await getProfile(user.id);
    if (!profile || !hasRole(profile.role, ROLES.canViewGrades)) {
      return c.json({ error: 'Sem permissão' }, 403);
    }
    const gradesData = await kv.getByPrefix(`grade:${c.req.param('studentId')}:`);
    let grades = gradesData;

    // Professor só vê notas das suas disciplinas
    if (profile.role === 'professor') {
      const assignedSubjects = profile.assignedSubjects || [];
      grades = grades.filter((g: any) => assignedSubjects.includes(g.subjectId));
    }

    return c.json({ grades });
  } catch (error) {
    return serverError(c, error);
  }
});

// ==================== FREQUÊNCIA ====================

app.post("/attendance", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const profile = await getProfile(user.id);
    if (!profile || profile.role !== 'professor') {
      return c.json({ error: 'Apenas professores podem registar frequência' }, 403);
    }
    const { studentId, classId, date, present } = await c.req.json();

    // Verificar se o professor tem acesso a esta turma
    const assignedClasses = profile.assignedClasses || [];
    if (!assignedClasses.includes(classId)) {
      return c.json({ error: 'Sem permissão para esta turma' }, 403);
    }

    const attendanceKey = `attendance:${studentId}:${classId}:${date}`;
    const attendanceRecord = {
      studentId, classId, date, present,
      teacherId: profile.id,
      recordedAt: new Date().toISOString(),
    };
    await kv.set(attendanceKey, attendanceRecord);
    return c.json({ success: true, attendance: attendanceRecord });
  } catch (error) {
    return serverError(c, error);
  }
});

app.get("/attendance/student/:studentId", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const profile = await getProfile(user.id);
    if (!profile || !hasRole(profile.role, ROLES.canViewAttendance)) {
      return c.json({ error: 'Sem permissão' }, 403);
    }
    const attendanceData = await kv.getByPrefix(`attendance:${c.req.param('studentId')}:`);
    const attendance = attendanceData.map((item: any) => item?.value ?? item);
    return c.json({ attendance });
  } catch (error) {
    return serverError(c, error);
  }
});

// ==================== PAGAMENTOS ====================

app.post("/payments", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const profile = await getProfile(user.id);
    if (!profile || !hasRole(profile.role, ROLES.canManageFinancial)) {
      return c.json({ error: 'Apenas o administrador pode gerir pagamentos' }, 403);
    }
    const paymentData = await c.req.json();
    const id = crypto.randomUUID();
    const today = new Date();
    const dueDay = 5; // Vencimento dia 5
    const dueDate = paymentData.dueDate || `${paymentData.year}-${String(paymentData.month).padStart(2, '0')}-0${dueDay}`;

    let status = paymentData.status || 'pending';
    if (!paymentData.paidDate && new Date(dueDate) < today) {
      status = 'overdue';
    }

    const newPayment = { ...paymentData, id, status, dueDate, createdAt: new Date().toISOString() };
    await kv.set(`payment:${id}`, newPayment);
    const list = await kv.get('payments:list') || [];
    list.push(id);
    await kv.set('payments:list', list);
    return c.json({ success: true, payment: newPayment });
  } catch (error) {
    return serverError(c, error);
  }
});

app.get("/payments", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const profile = await getProfile(user.id);
    if (!profile || !hasRole(profile.role, ROLES.canViewFinancial)) {
      return c.json({ error: 'Sem permissão' }, 403);
    }
    const list = await kv.get('payments:list') || [];
    const payments = (await kv.mget(list.map((id: string) => `payment:${id}`))).filter(Boolean);

    // Actualizar status automaticamente baseado no dia 5
    const today = new Date();
    const updatedPayments = payments.map((p: any) => {
      if (p.status !== 'paid' && p.dueDate && new Date(p.dueDate) < today) {
        return { ...p, status: 'overdue' };
      }
      return p;
    });

    return c.json({ payments: updatedPayments });
  } catch (error) {
    return serverError(c, error);
  }
});

app.get("/payments/stats", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const profile = await getProfile(user.id);
    if (!profile || !hasRole(profile.role, ROLES.canViewFinancial)) {
      return c.json({ error: 'Sem permissão' }, 403);
    }
    const list = await kv.get('payments:list') || [];
    const payments = (await kv.mget(list.map((id: string) => `payment:${id}`))).filter(Boolean);
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    const stats = {
      totalPending: 0, totalPaid: 0, totalOverdue: 0, monthlyRevenue: 0,
      alertDueSoon: 0,   // vence nos próximos 3 dias
      alertOverdue: 0,   // já venceu
    };

    payments.forEach((p: any) => {
      if (!p) return;
      const due = new Date(p.dueDate);
      const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (p.status === 'paid') {
        stats.totalPaid += p.amount;
        if (p.paidDate) {
          const d = new Date(p.paidDate);
          if (d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear) {
            stats.monthlyRevenue += p.amount;
          }
        }
      } else if (p.status === 'overdue' || (p.status !== 'paid' && due < today)) {
        stats.totalOverdue += p.amount;
        stats.alertOverdue++;
      } else if (p.status === 'pending') {
        stats.totalPending += p.amount;
        if (diffDays <= 3 && diffDays >= 0) stats.alertDueSoon++;
      }
    });

    return c.json(stats);
  } catch (error) {
    return serverError(c, error);
  }
});

app.get("/payments/student/:studentId", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const profile = await getProfile(user.id);
    if (!profile || !hasRole(profile.role, ROLES.canViewFinancial)) {
      return c.json({ error: 'Sem permissão' }, 403);
    }
    const studentId = c.req.param('studentId');
    const list = await kv.get('payments:list') || [];
    const all = (await kv.mget(list.map((id: string) => `payment:${id}`))).filter(Boolean);
    const payments = all.filter((p: any) => p.studentId === studentId);
    return c.json({ payments });
  } catch (error) {
    return serverError(c, error);
  }
});

app.put("/payments/:id", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const profile = await getProfile(user.id);
    if (!profile || !hasRole(profile.role, ROLES.canManageFinancial)) {
      return c.json({ error: 'Apenas o administrador pode editar pagamentos' }, 403);
    }
    const id = c.req.param('id');
    const existing = await kv.get(`payment:${id}`);
    if (!existing) return c.json({ error: 'Não encontrado' }, 404);
    const updated = { ...existing, ...await c.req.json(), id, updatedAt: new Date().toISOString() };
    await kv.set(`payment:${id}`, updated);
    return c.json({ success: true, payment: updated });
  } catch (error) {
    return serverError(c, error);
  }
});

app.delete("/payments/:id", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const profile = await getProfile(user.id);
    if (!profile || !hasRole(profile.role, ROLES.canManageFinancial)) {
      return c.json({ error: 'Apenas o administrador pode apagar pagamentos' }, 403);
    }
    const id = c.req.param('id');
    await kv.del(`payment:${id}`);
    const list = await kv.get('payments:list') || [];
    await kv.set('payments:list', list.filter((pid: string) => pid !== id));
    return c.json({ success: true });
  } catch (error) {
    return serverError(c, error);
  }
});

// ==================== PORTAL DO ENCARREGADO ====================
// Devolve APENAS os dados dos alunos ligados ao encarregado autenticado.
// Scoping é feito no servidor: o encarregado nunca recebe dados de outros alunos.
app.get("/portal", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const profile = await getProfile(user.id);
    if (!profile || !hasRole(profile.role, ['encarregado', 'admin', 'director'])) {
      return c.json({ error: 'Sem permissão' }, 403);
    }

    const studentIds: string[] = Array.isArray(profile.studentIds) ? profile.studentIds : [];
    if (!studentIds.length) return c.json({ students: [] });

    // Lookup tables para resolver nomes de turma
    const classList = await kv.get('classes:list') || [];
    const classes = (await kv.mget(classList.map((id: string) => `class:${id}`))).filter(Boolean);
    const className = (id: string) => classes.find((cls: any) => cls.id === id)?.name || '—';

    // Pagamentos (uma leitura para todos os alunos)
    const paymentsList = await kv.get('payments:list') || [];
    const allPayments = (await kv.mget(paymentsList.map((id: string) => `payment:${id}`))).filter(Boolean);
    const today = new Date();

    const result = [];
    for (const sid of studentIds) {
      const student = await kv.get(`student:${sid}`);
      if (!student) continue;

      const grades = await kv.getByPrefix(`grade:${sid}:`);

      const attendanceRaw = await kv.getByPrefix(`attendance:${sid}:`);
      const attendance = attendanceRaw.map((item: any) => item?.value ?? item);

      const payments = allPayments
        .filter((p: any) => p?.studentId === sid)
        .map((p: any) =>
          p.status !== 'paid' && p.dueDate && new Date(p.dueDate) < today
            ? { ...p, status: 'overdue' }
            : p
        );

      result.push({
        student,
        className: className(student.classId),
        grades,
        attendance,
        payments,
      });
    }

    return c.json({ students: result });
  } catch (error) {
    return serverError(c, error);
  }
});

// ==================== FUNCIONÁRIOS ====================

app.post("/funcionarios", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const profile = await getProfile(user.id);
    if (!profile || profile.role !== 'admin') return c.json({ error: 'Sem permissão' }, 403);
    const data = await c.req.json();
    const id = crypto.randomUUID();
    const funcionario = { ...data, id, createdAt: new Date().toISOString() };
    await kv.set(`funcionario:${id}`, funcionario);
    const list = await kv.get('funcionarios:list') || [];
    list.push(id);
    await kv.set('funcionarios:list', list);
    return c.json({ success: true, funcionario });
  } catch (error) { return serverError(c, error); }
});

app.get("/funcionarios", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const profile = await getProfile(user.id);
    if (!profile || !['admin', 'secretaria'].includes(profile.role)) return c.json({ error: 'Sem permissão' }, 403);
    const list = await kv.get('funcionarios:list') || [];
    const funcionarios = (await kv.mget(list.map((id: string) => `funcionario:${id}`))).filter(Boolean);
    return c.json({ funcionarios });
  } catch (error) { return serverError(c, error); }
});

app.get("/funcionarios/:id", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const profile = await getProfile(user.id);
    if (!profile || !['admin', 'secretaria'].includes(profile.role)) return c.json({ error: 'Sem permissão' }, 403);
    const funcionario = await kv.get(`funcionario:${c.req.param('id')}`);
    if (!funcionario) return c.json({ error: 'Não encontrado' }, 404);
    return c.json({ funcionario });
  } catch (error) { return serverError(c, error); }
});

app.put("/funcionarios/:id", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const profile = await getProfile(user.id);
    if (!profile || profile.role !== 'admin') return c.json({ error: 'Sem permissão' }, 403);
    const id = c.req.param('id');
    const existing = await kv.get(`funcionario:${id}`);
    if (!existing) return c.json({ error: 'Não encontrado' }, 404);
    const updated = { ...existing, ...await c.req.json(), id, updatedAt: new Date().toISOString() };
    await kv.set(`funcionario:${id}`, updated);
    return c.json({ success: true, funcionario: updated });
  } catch (error) { return serverError(c, error); }
});

app.delete("/funcionarios/:id", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const profile = await getProfile(user.id);
    if (!profile || profile.role !== 'admin') return c.json({ error: 'Sem permissão' }, 403);
    const id = c.req.param('id');
    await kv.del(`funcionario:${id}`);
    const list = await kv.get('funcionarios:list') || [];
    await kv.set('funcionarios:list', list.filter((fid: string) => fid !== id));
    return c.json({ success: true });
  } catch (error) { return serverError(c, error); }
});

// ==================== FOLHA DE PAGAMENTO ====================

app.post("/folha-pagamento", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const profile = await getProfile(user.id);
    if (!profile || profile.role !== 'admin') return c.json({ error: 'Sem permissão' }, 403);
    const data = await c.req.json();
    const id = crypto.randomUUID();
    // Buscar nome do funcionário
    const funcionario = await kv.get(`funcionario:${data.funcionarioId || data.funcionario_id}`);
    const pagamento = {
      ...data,
      id,
      funcionarioNome: funcionario?.nome || 'N/A',
      funcionarioCargo: funcionario?.cargo || 'N/A',
      status: 'pago',
      createdAt: new Date().toISOString(),
    };
    await kv.set(`folha:${id}`, pagamento);
    const list = await kv.get('folha:list') || [];
    list.push(id);
    await kv.set('folha:list', list);
    return c.json({ success: true, pagamento });
  } catch (error) { return serverError(c, error); }
});

app.get("/folha-pagamento", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const profile = await getProfile(user.id);
    if (!profile || !['admin', 'secretaria'].includes(profile.role)) return c.json({ error: 'Sem permissão' }, 403);
    const list = await kv.get('folha:list') || [];
    const pagamentos = (await kv.mget(list.map((id: string) => `folha:${id}`))).filter(Boolean);
    return c.json({ pagamentos });
  } catch (error) { return serverError(c, error); }
});

app.get("/folha-pagamento/funcionario/:funcionarioId", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const profile = await getProfile(user.id);
    if (!profile || !['admin', 'secretaria'].includes(profile.role)) return c.json({ error: 'Sem permissão' }, 403);
    const funcionarioId = c.req.param('funcionarioId');
    const list = await kv.get('folha:list') || [];
    const all = (await kv.mget(list.map((id: string) => `folha:${id}`))).filter(Boolean);
    const pagamentos = all.filter((p: any) =>
      p.funcionarioId === funcionarioId || p.funcionario_id === funcionarioId
    );
    return c.json({ pagamentos });
  } catch (error) { return serverError(c, error); }
});

app.get("/folha-pagamento/check", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const { funcionario_id, mes, ano } = c.req.query();
    const list = await kv.get('folha:list') || [];
    const all = (await kv.mget(list.map((id: string) => `folha:${id}`))).filter(Boolean);
    const exists = all.some((p: any) =>
      (p.funcionarioId === funcionario_id || p.funcionario_id === funcionario_id) &&
      p.mes == mes && p.ano == ano
    );
    return c.json({ exists });
  } catch (error) { return serverError(c, error); }
});

app.get("/folha-pagamento/periodo", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const profile = await getProfile(user.id);
    if (!profile || !['admin', 'secretaria'].includes(profile.role)) return c.json({ error: 'Sem permissão' }, 403);
    const { mes, ano } = c.req.query();
    const list = await kv.get('folha:list') || [];
    const all = (await kv.mget(list.map((id: string) => `folha:${id}`))).filter(Boolean);
    const pagamentos = all.filter((p: any) => p.mes == mes && p.ano == ano);
    return c.json({ pagamentos });
  } catch (error) { return serverError(c, error); }
});

// ==================== AUDIT LOG — CONSULTA ====================

// Ver todos os logs — só admin
app.get("/audit", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const profile = await getProfile(user.id);
    if (!profile || profile.role !== 'admin') return c.json({ error: 'Sem permissão' }, 403);

    const list: string[] = await kv.get('audit:list') || [];
    const entries = (await kv.mget(list.map((id: string) => `audit:${id}`))).filter(Boolean);

    // Ordenar do mais recente para o mais antigo
    entries.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Filtros opcionais
    const { module, action, userId, limit = '100' } = c.req.query();
    let filtered = entries;
    if (module) filtered = filtered.filter((e: any) => e.module === module);
    if (action) filtered = filtered.filter((e: any) => e.action === action);
    if (userId) filtered = filtered.filter((e: any) => e.userId === userId);

    return c.json({ logs: filtered.slice(0, parseInt(limit)), total: filtered.length });
  } catch (error) {
    return serverError(c, error);
  }
});

// Ver logs do utilizador actual
app.get("/audit/me", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const list: string[] = await kv.get('audit:list') || [];
    const entries = (await kv.mget(list.map((id: string) => `audit:${id}`))).filter(Boolean);
    const myLogs = entries
      .filter((e: any) => e.userId === user.id)
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 50);
    return c.json({ logs: myLogs });
  } catch (error) {
    return serverError(c, error);
  }
});

// ==================== RESET DO SISTEMA ====================
// Apaga todos os dados de teste — só developer pode usar

app.post("/reset", async (c) => {
  try {
    const serviceKey = c.req.header('X-Service-Key');
    const expectedKey = Deno.env.get('SERVICE_MANAGEMENT_KEY');
    if (!serviceKey || serviceKey !== expectedKey) {
      return c.json({ error: 'Não autorizado' }, 401);
    }

    const { confirm } = await c.req.json().catch(() => ({}));
    if (confirm !== 'RESET_CONFIRMED') {
      return c.json({ error: 'Confirma o reset enviando confirm: "RESET_CONFIRMED"' }, 400);
    }

    // Apagar utilizadores do KV
    const usersList = await kv.get('users:list') || [];
    for (const id of usersList) {
      await kv.del(`user:${id}`);
    }
    await kv.del('users:list');

    // Apagar alunos
    const studentsList = await kv.get('students:list') || [];
    for (const id of studentsList) await kv.del(`student:${id}`);
    await kv.del('students:list');

    // Apagar professores
    const teachersList = await kv.get('teachers:list') || [];
    for (const id of teachersList) await kv.del(`teacher:${id}`);
    await kv.del('teachers:list');

    // Apagar turmas
    const classesList = await kv.get('classes:list') || [];
    for (const id of classesList) await kv.del(`class:${id}`);
    await kv.del('classes:list');

    // Apagar disciplinas
    const subjectsList = await kv.get('subjects:list') || [];
    for (const id of subjectsList) await kv.del(`subject:${id}`);
    await kv.del('subjects:list');

    // Apagar pagamentos
    const paymentsList = await kv.get('payments:list') || [];
    for (const id of paymentsList) await kv.del(`payment:${id}`);
    await kv.del('payments:list');

    // Apagar funcionários
    const funcionariosList = await kv.get('funcionarios:list') || [];
    for (const id of funcionariosList) await kv.del(`funcionario:${id}`);
    await kv.del('funcionarios:list');

    // Apagar folha de pagamento
    const folhaList = await kv.get('folha:list') || [];
    for (const id of folhaList) await kv.del(`folha:${id}`);
    await kv.del('folha:list');

    // Apagar audit logs
    const auditList = await kv.get('audit:list') || [];
    for (const id of auditList) await kv.del(`audit:${id}`);
    await kv.del('audit:list');

    // Apagar licença activa (sistema volta ao estado inicial)
    await kv.del('license:active');

    // Apagar contador de professores
    await kv.del('professor:counter');

    // Apagar utilizadores do Supabase Auth
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    if (authUsers?.users) {
      for (const u of authUsers.users) {
        await supabase.auth.admin.deleteUser(u.id);
      }
    }

    return c.json({
      success: true,
      message: 'Sistema limpo com sucesso! Todos os dados de teste foram removidos.',
      deleted: {
        users: usersList.length,
        students: studentsList.length,
        teachers: teachersList.length,
        classes: classesList.length,
        subjects: subjectsList.length,
        payments: paymentsList.length,
        funcionarios: funcionariosList.length,
        auditLogs: auditList.length,
      }
    });
  } catch (error) {
    return serverError(c, error);
  }
});

Deno.serve(app.fetch);
