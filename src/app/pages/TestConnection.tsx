import { useState } from "react";
import { API_URL, projectId, publicAnonKey } from "../lib/supabase";
import { CheckCircle2, XCircle, Loader } from "lucide-react";

type TestResult = { success: boolean; data?: unknown; error?: string };

type Results = {
  health: TestResult | null;
  signup: TestResult & { testUser?: { email: string; password: string; name: string; role: string } } | null;
  login: TestResult | null;
};

export default function TestConnection() {
  const [results, setResults] = useState<Results>({
    health: null,
    signup: null,
    login: null,
  });
  const [loading, setLoading] = useState<string | null>(null);

  const testHealth = async () => {
    setLoading("health");
    try {
      const response = await fetch(`${API_URL}/health`);
      const data = await response.json();
      setResults(prev => ({
        ...prev,
        health: { success: response.ok, data },
      }));
    } catch (error) {
      setResults(prev => ({
        ...prev,
        health: { success: false, error: error instanceof Error ? error.message : "Erro desconhecido" },
      }));
    } finally {
      setLoading(null);
    }
  };

  const testSignup = async () => {
    setLoading("signup");
    const testUser = {
      email: `test${Date.now()}@escola.com`,
      password: "123456",
      name: "Teste Admin",
      role: "admin",
    };
    
    try {
      const response = await fetch(`${API_URL}/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testUser),
      });
      const data = await response.json();
      setResults(prev => ({
        ...prev,
        signup: { success: response.ok, data, testUser },
      }));
    } catch (error) {
      setResults(prev => ({
        ...prev,
        signup: { success: false, error: error instanceof Error ? error.message : "Erro desconhecido" },
      }));
    } finally {
      setLoading(null);
    }
  };

  const testLogin = async () => {
    if (!results.signup?.success || !results.signup.testUser) {
      alert("Execute o teste de signup primeiro");
      return;
    }

    setLoading("login");
    const { email, password } = results.signup.testUser;
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/auth/v1/token?grant_type=password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: publicAnonKey,
          },
          body: JSON.stringify({ email, password }),
        }
      );
      const data = await response.json();
      setResults(prev => ({
        ...prev,
        login: { success: response.ok, data },
      }));
    } catch (error) {
      setResults(prev => ({
        ...prev,
        login: { success: false, error: error instanceof Error ? error.message : "Erro desconhecido" },
      }));
    } finally {
      setLoading(null);
    }
  };

  const ResultBadge = ({ result }: { result: TestResult | null }) => {
    if (result === null) return <span className="text-gray-400">Não testado</span>;
    if (result.success)
      return (
        <span className="flex items-center text-green-600">
          <CheckCircle2 className="h-5 w-5 mr-1" /> Sucesso
        </span>
      );
    return (
      <span className="flex items-center text-red-600">
        <XCircle className="h-5 w-5 mr-1" /> Falhou
      </span>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Teste de Conexão do Backend
        </h1>
        <p className="text-gray-600 mb-6">
          Use esta página para diagnosticar problemas de autenticação
        </p>

        <div className="space-y-4">
          {/* Health Check */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">1. Health Check</h3>
              <ResultBadge result={results.health} />
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Verifica se o servidor está respondendo
            </p>
            <button
              onClick={testHealth}
              disabled={loading === "health"}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 text-sm flex items-center"
            >
              {loading === "health" && <Loader className="animate-spin h-4 w-4 mr-2" />}
              Testar Health
            </button>
            {results.health && (
              <pre className="mt-3 bg-gray-100 p-3 rounded text-xs overflow-auto">
                {JSON.stringify(results.health, null, 2)}
              </pre>
            )}
          </div>

          {/* Signup Test */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">2. Teste de Cadastro</h3>
              <ResultBadge result={results.signup} />
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Cria um usuário de teste no sistema
            </p>
            <button
              onClick={testSignup}
              disabled={loading === "signup"}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 text-sm flex items-center"
            >
              {loading === "signup" && <Loader className="animate-spin h-4 w-4 mr-2" />}
              Testar Signup
            </button>
            {results.signup && (
              <pre className="mt-3 bg-gray-100 p-3 rounded text-xs overflow-auto max-h-64">
                {JSON.stringify(results.signup, null, 2)}
              </pre>
            )}
          </div>

          {/* Login Test */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">3. Teste de Login</h3>
              <ResultBadge result={results.login} />
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Tenta fazer login com o usuário criado no passo anterior
            </p>
            <button
              onClick={testLogin}
              disabled={loading === "login" || !results.signup?.success}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 text-sm flex items-center"
            >
              {loading === "login" && <Loader className="animate-spin h-4 w-4 mr-2" />}
              Testar Login
            </button>
            {results.login && (
              <pre className="mt-3 bg-gray-100 p-3 rounded text-xs overflow-auto max-h-64">
                {JSON.stringify(results.login, null, 2)}
              </pre>
            )}
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-2">Informações do Sistema</h4>
          <div className="text-sm space-y-1">
            <p>
              <strong>Project ID:</strong> {projectId}
            </p>
            <p>
              <strong>API URL:</strong> {API_URL}
            </p>
            <p>
              <strong>Anon Key:</strong> {publicAnonKey.substring(0, 30)}...
            </p>
          </div>
        </div>

        <div className="mt-6">
          <a
            href="/"
            className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
          >
            ← Voltar para Login
          </a>
        </div>
      </div>
    </div>
  );
}
