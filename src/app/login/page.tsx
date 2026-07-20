import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight">StockScan</h1>
          <p className="mt-1 text-sm text-slate-500">Inventario colaborativo</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
