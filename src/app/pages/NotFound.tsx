import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-gray-300">404</h1>
        <h2 className="text-3xl font-semibold text-gray-900 mt-4">
          Página não encontrada
        </h2>
        <p className="text-gray-600 mt-2 mb-8">
          A página que você está procurando não existe.
        </p>
        <a
          href="/dashboard"
          className="inline-flex items-center space-x-2 bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700"
        >
          <Home className="h-5 w-5" />
          <span>Voltar ao Dashboard</span>
        </a>
      </div>
    </div>
  );
}
