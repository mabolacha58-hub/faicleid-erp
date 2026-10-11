import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

const app = new Hono();

app.use('*', logger(console.log));
app.use("/*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
}));

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
      ip: 'N/A',
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

// ==================== ACTIVATION KEYS ====================

const generateActivationKey = (type: 'trial' | 'annual'): string => {
  const prefix = type === 'trial' ? 'FCLEID-X' : 'FCLEID-A';
  const segments = Array.from({ length: 5 }, () => 
    Math.random().toString(36).substring(2, 6).toUpperCase()
  ).join('-');
  return `${prefix}-${segments}`;
};

const validateKeyFormat = (key: string): { valid: boolean; type?: 'trial' | 'annual' } => {
  if (!key.startsWith('FCLEID-')) return { valid: false };
  const typeChar = key.split('-')[1];
  if (typeChar === 'X') return { valid: true, type: 'trial' };
  if (typeChar === 'A') return { valid: true, type: 'annual' };
  return { valid: false };
};

const getKeyData = async (key: string) => {
  return await kv.get(`activation_key:${key}`);
};

const setKeyData = async (key: string, data: any) => {
  await kv.set(`activation_key:${key}`, data);
  const list = await kv.get('activation_keys:list') || [];
  if (!list.includes(key)) {
    list.push(key);
    await kv.set('activation_keys:list', list);
  }
};

const getLicense = async () => {
  return await kv.get('license:info');
};

const setLicense = async (data: any) => {
  await kv.set('license:info', data);
};

// ==================== HEALTH ====================

app.get("/make-server-513143ac/health", (c) => c.json({ status: "ok" }));

// ==================== ACTIVATION ENDPOINTS ====================

// Verificar chave (público - não precisa auth)
app.post("/make-server-513143ac/activation-keys/verify", async (c) => {
  try {
    const { activationKey } = await c.req.json();
    if (!activationKey) {
      return c.json({ valid: false, error: 'Chave obrigatória' }, 400);
    }

    const format = validateKeyFormat(activationKey.toUpperCase());
    if (!format.valid) {
      return c.json({ valid: false, error: 'Formato inválido. Use FCLEID-X-... ou FCLEID-A-...' }, 400);
    }

    const keyData = await getKeyData(activationKey.toUpperCase());
    if (!keyData) {
      return c.json({ valid: false, error: 'Chave não encontrada' }, 404);
    }

    if (keyData.used) {
      return c.json({ valid: false, error: 'Chave já foi utilizada', usedAt: keyData.usedAt }, 400);
    }

    return c.json({ 
      valid: true, 
      school: keyData.school || 'Escola não definida',
      type: keyData.type 
    });
  } catch (error) {
    return c.json({ valid: false, error: String(error) }, 500);
  }
});

// Ativar sistema com chave (público - não precisa auth)
app.post("/make-server-513143ac/activation-keys/activate", async (c) => {
  try {
    const { activationKey } = await c.req.json();
    if (!activationKey) {
      return c.json({ success: false, error: 'Chave obrigatória' }, 400);
    }

    const key = activationKey.toUpperCase();
    const format = validateKeyFormat(key);
    if (!format.valid) {
      return c.json({ success: false, error: 'Formato inválido' }, 400);
    }

    const keyData = await getKeyData(key);
    if (!keyData) {
      return c.json({ success: false, error: 'Chave não encontrada' }, 404);
    }

    if (keyData.used) {
      return c.json({ success: false, error: 'Chave já foi utilizada' }, 400);
    }

    // Calcular expiração
    const now = new Date();
    let expiresAt: Date;
    if (keyData.type === 'trial') {
      expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 dias
    } else {
      expiresAt = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()); // 1 ano
    }

    // Marcar chave como usada
    keyData.used = true;
    keyData.usedAt = now.toISOString();
    keyData.usedBy = keyData.school || 'Sistema';
    await setKeyData(key, keyData);

    // Salvar licença
    const license = {
      status: 'active',
      school: keyData.school || 'Escola ativada',
      tipo: keyData.type === 'trial' ? 'Trial (30 dias)' : 'Anual',
      expiresAt: expiresAt.toISOString(),
      daysLeft: Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      expired: false,
      activatedAt: now.toISOString(),
      activationKey: key,
    };
    await setLicense(license);

    return c.json({ 
      success: true, 
      school: license.school,
      license 
    });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Consultar licença atual (público)
app.get("/make-server-513143ac/license", async (c) => {
  try {
    const license = await getLicense();
    if (!license) {
      return c.json({ 
        status: 'no_license', 
        school: null, 
        tipo: null, 
        expiresAt: null, 
        daysLeft: 0, 
        expired: true 
      });
    }

    const now = new Date();
    const expiresAt = new Date(license.expiresAt);
    const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const expired = daysLeft <= 0;

    let status = license.status;
    if (expired) status = 'expired';
    else if (daysLeft <= 7) status = 'expiring';
    else if (daysLeft <= 30) status = 'expiring_soon';

    return c.json({
      ...license,
      status,
      daysLeft: Math.max(0, daysLeft),
      expired,
    });
  } catch (error) {
    return c.json({ 
      status: 'no_license', 
      error: String(error),
      daysLeft: 0, 
      expired: true 
    });
  }
});

// ==================== ADMIN: GERIR CHAVES ====================

// Listar chaves (admin)
app.get("/make-server-513143ac/activation-keys", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const profile = await getProfile(user.id);
    if (!profile || profile.role !== 'admin') return c.json({ error: 'Sem permissão' }, 403);

    const list = await kv.get('activation_keys:list') || [];
    const keys = await kv.mget(list.map((k: string) => `activation_key:${k}`));
    return c.json({ keys: keys.filter(Boolean).sort((a: any, b: any) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )});
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// Criar nova chave (admin)
app.post("/make-server-513143ac/activation-keys", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const profile = await getProfile(user.id);
    if (!profile || profile.role !== 'admin') return c.json({ error: 'Sem permissão' }, 403);

    const { type, school } = await c.req.json();
    if (!type || !['trial', 'annual'].includes(type)) {
      return c.json({ error: 'Tipo inválido. Use "trial" ou "annual"' }, 400);
    }

    const key = generateActivationKey(type);
    const keyData = {
      key,
      type,
      school: school || '',
      used: false,
      createdAt: new Date().toISOString(),
      createdBy: profile.name,
    };
    await setKeyData(key, keyData);

    // Audit
    await auditLog(profile.id, profile.name, profile.role, 'CREATE', 'activation_keys', `Chave ${type} criada: ${key} para ${school || 'sem escola'}`);

    return c.json({ success: true, key: keyData });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// Apagar chave (admin)
app.delete("/make-server-513143ac/activation-keys/:key", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const profile = await getProfile(user.id);
    if (!profile || profile.role !== 'admin') return c.json({ error: 'Sem permissão' }, 403);

    const key = c.req.param('key').toUpperCase();
    await kv.del(`activation_key:${key}`);
    const list = await kv.get('activation_keys:list') || [];
    await kv.set('activation_keys:list', list.filter((k: string) => k !== key));

    await auditLog(profile.id, profile.name, profile.role, 'DELETE', 'activation_keys', `Chave removida: ${key}`);

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// ==================== AUTH ====================

app.post("/make-server-513143ac/signup", async (c) => {
  try {
    const { email, password, name, role } = await c.req.json();
    if (!email || !password || !name || !role) {
      return c.json({ error: 'Campos obrigatórios em falta' }, 400);
    }

    const validRoles = ['admin', 'director', 'pedagogico', 'professor', 'secretaria'];
    if (!validRoles.includes(role)) {
      return c.json({ error: 'Papel inválido' }, 400);
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

    // Se for professor, gerar código de acesso
    if (role === 'professor') {
      profile.accessCode = await generateAccessCode();
      profile.assignedClasses = [];
      profile.assignedSubjects = [];
    }

    await kv.set(`user:${data.user.id}`, profile);

    // Adicionar à lista de utilizadores
    const usersList = await kv.get('users:list') || [];
    usersList.push(data.user.id);
    await kv.set('users:list', usersList);

    // ── Audit: Criação de utilizador
    await auditLog(data.user.id, name, role, 'CREATE', 'users', `Nova conta criada: ${name} (${role}) — ${email}`);

    return c.json({ success: true, user: profile });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

app.get("/make-server-513143ac/me", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const profile = await getProfile(user.id);
    // ── Audit: Login (quando /me é chamado após login)
    if (profile) {
      await auditLog(profile.id, profile.name, profile.role, 'LOGIN', 'auth', `Sessão iniciada por ${profile.name} (${profile.role})`);
    }
    return c.json({ user: profile || user });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// ==================== UTILIZADORES ====================

// Listar todos os utilizadores (admin e director)
app.get("/make-server-513143ac/users", async (c) => {
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
    return c.json({ error: String(error) }, 500);
  }
});

// Actualizar utilizador (atribuir turmas/disciplinas ao professor)
app.put("/make-server-513143ac/users/:id", async (c) => {
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
    const updates = await c.req.json();
    const updated = { ...existing, ...updates, id, updatedAt: new Date().toISOString() };
    await kv.set(`user:${id}`, updated);
    return c.json({ success: true, user: updated });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// Apagar utilizador
app.delete("/make-server-513143ac/users/:id", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const profile = await getProfile(user.id);
    if (!profile || !hasRole(profile.role, ROLES.canManageUsers)) {
      return c.json({ error: 'Sem permissão' }, 403);
    }
    const id = c.req.param('id');
    await kv.del(`user:${id}`);
    const usersList = await kv.get('users:list') || [];
    await kv.set('users:list', usersList.filter((uid: string) => uid !== id));
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// ==================== ALUNOS ====================

app.post("/make-server-513143ac/students", async (c) => {
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
    await auditLog(profile.id, profile.name, profile.role, 'CREATE', 'students', `Aluno criado: ${student.name}`, id);
    return c.json({ success: true, student: newStudent });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

app.get("/make-server-513143ac/students", async (c) => {
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
    return c.json({ error: String(error) }, 500);
  }
});

app.get("/make-server-513143ac/students/:id", async (c) => {
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
    return c.json({ error: String(error) }, 500);
  }
});

app.put("/make-server-513143ac/students/:id", async (c) => {
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
    return c.json({ error: String(error) }, 500);
  }
});

app.delete("/make-server-513143ac/students/:id", async (c) => {
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
    return c.json({ error: String(error) }, 500);
  }
});

// ==================== PROFESSORES ====================

app.post("/make-server-513143ac/teachers", async (c) => {
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
    return c.json({ error: String(error) }, 500);
  }
});

app.get("/make-server-513143ac/teachers", async (c) => {
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
    return c.json({ error: String(error) }, 500);
  }
});

app.put("/make-server-513143ac/teachers/:id", async (c) => {
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
    return c.json({ error: String(error) }, 500);
  }
});

app.delete("/make-server-513143ac/teachers/:id", async (c) => {
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
    return c.json({ error: String(error) }, 500);
  }
});

// ==================== TURMAS ====================

app.post("/make-server-513143ac/classes", async (c) => {
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
    return c.json({ error: String(error) }, 500);
  }
});

app.get("/make-server-513143ac/classes", async (c) => {
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
    return c.json({ error: String(error) }, 500);
  }
});

app.put("/make-server-513143ac/classes/:id", async (c) => {
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
    return c.json({ error: String(error) }, 500);
  }
});

app.delete("/make-server-513143ac/classes/:id", async (c) => {
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
    return c.json({ error: String(error) }, 500);
  }
});

// ==================== DISCIPLINAS ====================

app.post("/make-server-513143ac/subjects", async (c) => {
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
    return c.json({ error: String(error) }, 500);
  }
});

app.get("/make-server-513143ac/subjects", async (c) => {
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
    return c.json({ error: String(error) }, 500);
  }
});

app.put("/make-server-513143ac/subjects/:id", async (c) => {
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
    return c.json({ error: String(error) }, 500);
  }
});

app.delete("/make-server-513143ac/subjects/:id", async (c) => {
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
    return c.json({ error: String(error) }, 500);
  }
});

// ==================== NOTAS ====================

app.post("/make-server-513143ac/grades", async (c) => {
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
    return c.json({ error: String(error) }, 500);
  }
});

app.get("/make-server-513143ac/grades/student/:studentId", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const profile = await getProfile(user.id);
    if (!profile || !hasRole(profile.role, ROLES.canViewGrades)) {
      return c.json({ error: 'Sem permissão' }, 403);
    }
    const gradesData = await kv.getByPrefix(`grade:${c.req.param('studentId')}:`);
    let grades = gradesData.map((item: any) => item.value);

    // Professor só vê notas das suas disciplinas
    if (profile.role === 'professor') {
      const assignedSubjects = profile.assignedSubjects || [];
      grades = grades.filter((g: any) => assignedSubjects.includes(g.subjectId));
    }

    return c.json({ grades });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// ==================== FREQUÊNCIA ====================

app.post("/make-server-513143ac/attendance", async (c) => {
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
    return c.json({ error: String(error) }, 500);
  }
});

app.get("/make-server-513143ac/attendance/student/:studentId", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const profile = await getProfile(user.id);
    if (!profile || !hasRole(profile.role, ROLES.canViewAttendance)) {
      return c.json({ error: 'Sem permissão' }, 403);
    }
    const attendanceData = await kv.getByPrefix(`attendance:${c.req.param('studentId')}:`);
    const attendance = attendanceData.map((item: any) => item.value);
    return c.json({ attendance });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// ==================== PAGAMENTOS ====================

app.post("/make-server-513143ac/payments", async (c) => {
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
    return c.json({ error: String(error) }, 500);
  }
});

app.get("/make-server-513143ac/payments", async (c) => {
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
    return c.json({ error: String(error) }, 500);
  }
});

app.get("/make-server-513143ac/payments/stats", async (c) => {
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
    return c.json({ error: String(error) }, 500);
  }
});

app.get("/make-server-513143ac/payments/student/:studentId", async (c) => {
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
    return c.json({ error: String(error) }, 500);
  }
});

app.put("/make-server-513143ac/payments/:id", async (c) => {
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
    return c.json({ error: String(error) }, 500);
  }
});

app.delete("/make-server-513143ac/payments/:id", async (c) => {
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
    return c.json({ error: String(error) }, 500);
  }
});

// ==================== FUNCIONÁRIOS ====================

app.post("/make-server-513143ac/funcionarios", async (c) => {
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
  } catch (error) { return c.json({ error: String(error) }, 500); }
});

app.get("/make-server-513143ac/funcionarios", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const profile = await getProfile(user.id);
    if (!profile || !['admin', 'secretaria'].includes(profile.role)) return c.json({ error: 'Sem permissão' }, 403);
    const list = await kv.get('funcionarios:list') || [];
    const funcionarios = (await kv.mget(list.map((id: string) => `funcionario:${id}`))).filter(Boolean);
    return c.json({ funcionarios });
  } catch (error) { return c.json({ error: String(error) }, 500); }
});

app.get("/make-server-513143ac/funcionarios/:id", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const profile = await getProfile(user.id);
    if (!profile || !['admin', 'secretaria'].includes(profile.role)) return c.json({ error: 'Sem permissão' }, 403);
    const funcionario = await kv.get(`funcionario:${c.req.param('id')}`);
    if (!funcionario) return c.json({ error: 'Não encontrado' }, 404);
    return c.json({ funcionario });
  } catch (error) { return c.json({ error: String(error) }, 500); }
});

app.put("/make-server-513143ac/funcionarios/:id", async (c) => {
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
  } catch (error) { return c.json({ error: String(error) }, 500); }
});

app.delete("/make-server-513143ac/funcionarios/:id", async (c) => {
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
  } catch (error) { return c.json({ error: String(error) }, 500); }
});

// ==================== FOLHA DE PAGAMENTO ====================

app.post("/make-server-513143ac/folha-pagamento", async (c) => {
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
  } catch (error) { return c.json({ error: String(error) }, 500); }
});

app.get("/make-server-513143ac/folha-pagamento", async (c) => {
  try {
    const user = await getAuthUser(c.req.header('Authorization'));
    if (!user) return c.json({ error: 'Não autorizado' }, 401);
    const profile = await getProfile(user.id);
    if (!profile || !['admin', 'secretaria'].includes(profile.role)) return c.json({ error: 'Sem permissão' }, 403);
    const list = await kv.get('folha:list') || [];
    const pagamentos = (await kv.mget(list.map((id: string) => `folha:${id}`))).filter(Boolean);
    return c.json({ pagamentos });
  } catch (error) { return c.json({ error: String(error) }, 500); }
});

app.get("/make-server-513143ac/folha-pagamento/funcionario/:funcionarioId", async (c) => {
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
  } catch (error) { return c.json({ error: String(error) }, 500); }
});

app.get("/make-server-513143ac/folha-pagamento/check", async (c) => {
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
  } catch (error) { return c.json({ error: String(error) }, 500); }
});

app.get("/make-server-513143ac/folha-pagamento/periodo", async (c) => {
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
  } catch (error) { return c.json({ error: String(error) }, 500); }
});

// ==================== AUDIT LOG — CONSULTA ====================

// Ver todos os logs — só admin
app.get("/make-server-513143ac/audit", async (c) => {
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
    return c.json({ error: String(error) }, 500);
  }
});

// Ver logs do utilizador actual
app.get("/make-server-513143ac/audit/me", async (c) => {
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
    return c.json({ error: String(error) }, 500);
  }
});

Deno.serve(app.fetch);