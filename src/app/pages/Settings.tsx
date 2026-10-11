import { useState } from "react";
import { getCurrentUser } from "../lib/auth";
import {
  Settings as SettingsIcon, Bell, Globe, Mail, Lock, School,
  DollarSign, Clock, Save, RefreshCw,
  ToggleLeft, ToggleRight, ChevronRight, Phone
} from "lucide-react";
import { motion } from "framer-motion";

interface SystemSettings {
  // Gerais
  schoolName: string;
  schoolAddress: string;
  schoolPhone: string;
  schoolEmail: string;
  schoolWebsite: string;
  schoolLogo: string;
  
  // Acadêmicas
  currentYear: number;
  currentSemester: number;
  enrollmentOpen: boolean;
  maxStudentsPerClass: number;
  passingGrade: number;
  maxAbsences: number;
  
  // Financeiras
  currency: string;
  dueDay: number;
  lateFeePercent: number;
  transportFee: number;
  enableFine: boolean;
  
  // Notificações
  emailNotifications: boolean;
  smsNotifications: boolean;
  whatsappNotifications: boolean;
  paymentReminders: boolean;
  attendanceAlerts: boolean;
  
  // Sistema
  language: string;
  timezone: string;
  dateFormat: string;
  darkMode: 'light' | 'dark' | 'system';
  maintenanceMode: boolean;
}

export default function Settings() {
  const user = getCurrentUser();
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  
  const [settings, setSettings] = useState<SystemSettings>({
    // Gerais
    schoolName: 'Instituto Politécnico FaiCleid, LDA',
    schoolAddress: 'Maputo, Moçambique',
    schoolPhone: '+258 84 000 0000',
    schoolEmail: 'info@faicleid.co.mz',
    schoolWebsite: 'www.faicleid.co.mz',
    schoolLogo: '/logo.png',
    
    // Acadêmicas
    currentYear: 2026,
    currentSemester: 1,
    enrollmentOpen: true,
    maxStudentsPerClass: 35,
    passingGrade: 10,
    maxAbsences: 15,
    
    // Financeiras
    currency: 'MZN',
    dueDay: 5,
    lateFeePercent: 5,
    transportFee: 500,
    enableFine: true,
    
    // Notificações
    emailNotifications: true,
    smsNotifications: false,
    whatsappNotifications: true,
    paymentReminders: true,
    attendanceAlerts: true,
    
    // Sistema
    language: 'pt',
    timezone: 'Africa/Maputo',
    dateFormat: 'DD/MM/YYYY',
    darkMode: 'system',
    maintenanceMode: false,
  });

  const handleSave = async () => {
    setLoading(true);
    // Simular salvamento
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    setLoading(false);
  };

  const tabs = [
    { id: 'general', label: 'Gerais', icon: SettingsIcon },
    { id: 'academic', label: 'Acadêmicas', icon: School },
    { id: 'financial', label: 'Financeiras', icon: DollarSign },
    { id: 'notifications', label: 'Notificações', icon: Bell },
    { id: 'system', label: 'Sistema', icon: Globe },
  ];

  // Só admin pode acessar configurações
  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Lock className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Acesso Restrito</h1>
          <p className="text-gray-600">Apenas administradores podem acessar as configurações do sistema.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Configurações do Sistema</h1>
            <p className="text-gray-500 mt-1">Gerencie todas as configurações da plataforma</p>
          </div>
          
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{loading ? 'Guardando...' : 'Guardar Alterações'}</span>
          </button>
        </div>

        {/* Toast de sucesso */}
        {saved && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 text-green-700"
          >
            <div className="p-1 bg-green-100 rounded-full">
              <Save className="w-4 h-4" />
            </div>
            <span className="text-sm">Configurações guardadas com sucesso!</span>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar de abas */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{tab.label}</span>
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Conteúdo da aba */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              {/* Geral */}
              {activeTab === 'general' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900">Informações Gerais</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nome da Instituição
                      </label>
                      <input
                        type="text"
                        value={settings.schoolName}
                        onChange={(e) => setSettings({ ...settings, schoolName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Endereço
                      </label>
                      <input
                        type="text"
                        value={settings.schoolAddress}
                        onChange={(e) => setSettings({ ...settings, schoolAddress: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Telefone
                      </label>
                      <input
                        type="text"
                        value={settings.schoolPhone}
                        onChange={(e) => setSettings({ ...settings, schoolPhone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={settings.schoolEmail}
                        onChange={(e) => setSettings({ ...settings, schoolEmail: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Website
                      </label>
                      <input
                        type="text"
                        value={settings.schoolWebsite}
                        onChange={(e) => setSettings({ ...settings, schoolWebsite: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Acadêmicas */}
              {activeTab === 'academic' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900">Configurações Acadêmicas</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ano Letivo Atual
                      </label>
                      <input
                        type="number"
                        value={settings.currentYear}
                        onChange={(e) => setSettings({ ...settings, currentYear: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Semestre Atual
                      </label>
                      <select
                        value={settings.currentSemester}
                        onChange={(e) => setSettings({ ...settings, currentSemester: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value={1}>1º Semestre</option>
                        <option value={2}>2º Semestre</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Máx. Alunos por Turma
                      </label>
                      <input
                        type="number"
                        value={settings.maxStudentsPerClass}
                        onChange={(e) => setSettings({ ...settings, maxStudentsPerClass: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nota Mínima para Aprovação
                      </label>
                      <input
                        type="number"
                        value={settings.passingGrade}
                        onChange={(e) => setSettings({ ...settings, passingGrade: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Máx. Faltas Permitidas
                      </label>
                      <input
                        type="number"
                        value={settings.maxAbsences}
                        onChange={(e) => setSettings({ ...settings, maxAbsences: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Matrículas Abertas
                      </label>
                      <button
                        onClick={() => setSettings({ ...settings, enrollmentOpen: !settings.enrollmentOpen })}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                          settings.enrollmentOpen
                            ? 'bg-green-50 border-green-200 text-green-700'
                            : 'bg-gray-50 border-gray-200 text-gray-500'
                        }`}
                      >
                        {settings.enrollmentOpen ? (
                          <>
                            <ToggleRight className="w-5 h-5" />
                            <span>Abertas</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-5 h-5" />
                            <span>Fechadas</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Financeiras */}
              {activeTab === 'financial' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900">Configurações Financeiras</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Moeda
                      </label>
                      <select
                        value={settings.currency}
                        onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="MZN">Metical (MZN)</option>
                        <option value="USD">Dólar (USD)</option>
                        <option value="EUR">Euro (EUR)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Dia de Vencimento
                      </label>
                      <input
                        type="number"
                        value={settings.dueDay}
                        onChange={(e) => setSettings({ ...settings, dueDay: parseInt(e.target.value) })}
                        min={1}
                        max={31}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Multa por Mês (%)
                      </label>
                      <input
                        type="number"
                        value={settings.lateFeePercent}
                        onChange={(e) => setSettings({ ...settings, lateFeePercent: parseFloat(e.target.value) })}
                        min={0}
                        max={100}
                        step={0.5}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Taxa de Transporte (MT)
                      </label>
                      <input
                        type="number"
                        value={settings.transportFee}
                        onChange={(e) => setSettings({ ...settings, transportFee: parseInt(e.target.value) })}
                        min={0}
                        step={50}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Aplicar Multas
                      </label>
                      <button
                        onClick={() => setSettings({ ...settings, enableFine: !settings.enableFine })}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                          settings.enableFine
                            ? 'bg-green-50 border-green-200 text-green-700'
                            : 'bg-gray-50 border-gray-200 text-gray-500'
                        }`}
                      >
                        {settings.enableFine ? (
                          <>
                            <ToggleRight className="w-5 h-5" />
                            <span>Ativadas</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-5 h-5" />
                            <span>Desativadas</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Notificações */}
              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900">Configurações de Notificações</h2>
                  
                  <div className="space-y-4">
                    {[
                      { id: 'emailNotifications', label: 'Notificações por Email', icon: Mail },
                      { id: 'smsNotifications', label: 'Notificações por SMS', icon: Phone },
                      { id: 'whatsappNotifications', label: 'Notificações por WhatsApp', icon: Globe },
                      { id: 'paymentReminders', label: 'Lembretes de Pagamento', icon: DollarSign },
                      { id: 'attendanceAlerts', label: 'Alertas de Frequência', icon: Clock },
                    ].map((item) => (
                      <div key={item.id} className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gray-100 rounded-lg">
                            <item.icon className="w-4 h-4 text-gray-600" />
                          </div>
                          <span className="text-sm text-gray-700">{item.label}</span>
                        </div>
                        <button
                          onClick={() => setSettings({ ...settings, [item.id]: !settings[item.id as keyof SystemSettings] })}
                          className={`relative w-12 h-6 rounded-full transition-colors ${
                            settings[item.id as keyof SystemSettings] ? 'bg-blue-600' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                              settings[item.id as keyof SystemSettings] ? 'translate-x-6' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sistema */}
              {activeTab === 'system' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900">Configurações do Sistema</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Idioma
                      </label>
                      <select
                        value={settings.language}
                        onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="pt">Português</option>
                        <option value="en">English</option>
                        <option value="fr">Français</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fuso Horário
                      </label>
                      <select
                        value={settings.timezone}
                        onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Africa/Maputo">Africa/Maputo (GMT+2)</option>
                        <option value="Africa/Luanda">Africa/Luanda (GMT+1)</option>
                        <option value="Africa/Lisbon">Europe/Lisbon (GMT+0)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Formato de Data
                      </label>
                      <select
                        value={settings.dateFormat}
                        onChange={(e) => setSettings({ ...settings, dateFormat: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Modo Escuro
                      </label>
                      <select
                        value={settings.darkMode}
                        onChange={(e) => setSettings({ ...settings, darkMode: e.target.value as 'light' | 'dark' | 'system' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="light">Claro</option>
                        <option value="dark">Escuro</option>
                        <option value="system">Sistema</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Modo de Manutenção
                      </label>
                      <button
                        onClick={() => setSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                          settings.maintenanceMode
                            ? 'bg-red-50 border-red-200 text-red-700'
                            : 'bg-gray-50 border-gray-200 text-gray-500'
                        }`}
                      >
                        {settings.maintenanceMode ? (
                          <>
                            <ToggleRight className="w-5 h-5" />
                            <span>Ativado (sistema indisponível)</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-5 h-5" />
                            <span>Desativado</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
