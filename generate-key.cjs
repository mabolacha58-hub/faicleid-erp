#!/usr/bin/env node
/**
 * ==========================================
 * FAICLEID ERP — GERADOR DE CHAVES DE ACTIVAÇÃO
 * ==========================================
 * Uso:
 *   node generate-key.js "Nome da Escola" trial       → 15 dias grátis
 *   node generate-key.js "Nome da Escola" trimestral  → 90 dias
 *   node generate-key.js "Nome da Escola" anual       → 365 dias
 * ==========================================
 */

const crypto = require('crypto');

const schoolName = process.argv[2] || 'Escola Sem Nome';
const tipo = (process.argv[3] || 'anual').toLowerCase();

const TIPOS = {
  trial:      { dias: 15,  label: 'Trial Gratuito (15 dias)', prefix: 'FCLEID-X', preco: 'GRÁTIS',         emoji: '🎁' },
  trimestral: { dias: 90,  label: 'Trimestral (90 dias)',     prefix: 'FCLEID-T', preco: '7.500 MT',       emoji: '📅' },
  anual:      { dias: 365, label: 'Anual (365 dias)',         prefix: 'FCLEID-A', preco: '25.000 MT',      emoji: '🏆' },
};

const config = TIPOS[tipo] || TIPOS.anual;

const raw = crypto.randomBytes(8).toString('hex').toUpperCase();
const key = `${config.prefix}-${raw.slice(0,4)}-${raw.slice(4,8)}-${raw.slice(8,12)}-${raw.slice(12,16)}`;
const keyHash = crypto.createHash('sha256').update(key).digest('hex');

const createdAt = new Date();
const expiresAt = new Date();
expiresAt.setDate(expiresAt.getDate() + config.dias);

const line = '═'.repeat(56);

console.log(`\n╔${line}╗`);
console.log(`║      ${config.emoji}  FAICLEID ERP — CHAVE DE ACTIVAÇÃO          ║`);
console.log(`╠${line}╣`);
console.log(`║  Escola:   ${schoolName.substring(0,42).padEnd(42)}║`);
console.log(`║  Tipo:     ${config.label.padEnd(42)}║`);
console.log(`║  Preço:    ${config.preco.padEnd(42)}║`);
console.log(`║  Chave:    ${key.padEnd(42)}║`);
console.log(`║  Criada:   ${createdAt.toLocaleDateString('pt-MZ').padEnd(42)}║`);
console.log(`║  Expira:   ${expiresAt.toLocaleDateString('pt-MZ').padEnd(42)}║`);
console.log(`╠${line}╣`);
console.log(`║  HASH (registar no backend):                         ║`);
console.log(`║  ${keyHash.slice(0,52).padEnd(52)}  ║`);
console.log(`║  ${keyHash.slice(52).padEnd(52)}  ║`);
console.log(`╚${line}╝`);

console.log('\n📋 COMANDO PARA REGISTAR NO BACKEND:');
console.log('─'.repeat(60));

const body = JSON.stringify({
  keyHash,
  key,
  school: schoolName,
  tipo,
  expiresAt: expiresAt.toISOString(),
});

const serviceKey = process.env.FAICLEID_SERVICE_KEY || '$FAICLEID_SERVICE_KEY';
console.log(`curl -X POST https://tsznvdytuzvbfcnujgbg.supabase.co/functions/v1/make-server-513143ac/activation-keys \\`);
console.log(`  -H "X-Service-Key: ${serviceKey}" \\`);
console.log(`  -H "Content-Type: application/json" \\`);
console.log(`  -d '${body}'`);

console.log('\n📱 MENSAGEM PARA ENVIAR AO CLIENTE:');
console.log('─'.repeat(60));

if (tipo === 'trial') {
  console.log(`Olá! Aqui está o seu acesso GRATUITO de 15 dias ao`);
  console.log(`FaiCleid ERP — Sistema de Gestão Escolar.`);
  console.log(``);
  console.log(`🔑 Chave: ${key}`);
  console.log(`🌐 Link:  https://faicleid-erp.vercel.app/signup`);
  console.log(`📅 Expira: ${expiresAt.toLocaleDateString('pt-MZ')}`);
  console.log(``);
  console.log(`Após o trial, pode continuar com:`);
  console.log(`  • Trimestral: 7.500 MT (3 meses)`);
  console.log(`  • Anual:     25.000 MT (1 ano) — poupa 2 meses!`);
} else {
  console.log(`Olá! Aqui está a sua chave de activação FaiCleid ERP.`);
  console.log(``);
  console.log(`🔑 Chave: ${key}`);
  console.log(`📦 Plano: ${config.label}`);
  console.log(`🌐 Link:  https://faicleid-erp.vercel.app/signup`);
  console.log(`📅 Válida até: ${expiresAt.toLocaleDateString('pt-MZ')}`);
}

console.log('\n⚠️  NUNCA partilhes o HASH — só a CHAVE!\n');

console.log('💾 JSON PARA ARQUIVO:');
console.log(JSON.stringify({
  key, keyHash, school: schoolName, tipo,
  preco: config.preco,
  createdAt: createdAt.toISOString(),
  expiresAt: expiresAt.toISOString()
}, null, 2));