import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");

  const navigate = useNavigate();
  const { toast } = useToast();

  const enviarLogin = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: usuario,
        password: senha,
      });

      if (error) {
        toast({ title: "Erro no login", description: error.message });
        return;
      }

      if (data?.session) {
        // fetch profile to determine role
        try {
          const userId = data.user?.id;

          // Primary: fetch profile from public.profiles
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("perfil")
            .eq("id", userId)
            .limit(1)
            .single();

          if (profileError) {
            console.error("profiles fetch error:", profileError);

            // Fallback: try to get user info from auth
            const { data: authUserData, error: getUserErr } = await supabase.auth.getUser();
            if (getUserErr) {
              console.error("auth.getUser error:", getUserErr);
              toast({ title: "Login bem-sucedido", description: "Não foi possível obter o perfil do usuário." });
              navigate("/");
              return;
            }

            const authUser = authUserData?.user;
            const roleFromMetadata = (authUser as any)?.user_metadata?.perfil || (authUser as any)?.user_metadata?.role;

            if (roleFromMetadata) {
              handleRedirectByRole(roleFromMetadata as string);
              return;
            }

            toast({ title: "Login bem-sucedido", description: "Não foi possível obter o perfil do usuário." });
            navigate("/");
            return;
          }

          const role = profile?.perfil as string | undefined;
          handleRedirectByRole(role);
        } catch (err) {
          console.error("error determining profile:", err);
          toast({ title: "Login bem-sucedido" });
          navigate("/");
        }
      } else {
        toast({ title: "Login", description: "Verifique suas credenciais." });
      }
    } catch (err: any) {
      toast({ title: "Erro no login", description: err?.message ?? String(err) });
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Lado Esquerdo - Formulário */}
      <div className="flex w-full items-center justify-center px-4 py-8 sm:px-6 lg:w-1/2 lg:px-8 xl:w-auto xl:min-w-[584px] xl:px-0 xl:pl-[136px] xl:pr-[68px]">
        <div className="w-full max-w-md xl:max-w-[448px]">
          <div className="rounded-[10px] border border-white bg-white shadow-[0_0_2px_0_rgba(23,26,31,0.12),0_0_1px_0_rgba(23,26,31,0.07)] p-6 sm:p-8 xl:p-10">
            {/* Logo e Título */}
            <div className="mb-6 flex items-center sm:mb-8">
              <svg
                className="h-10 w-10 flex-shrink-0 sm:h-12 sm:w-12"
                width="48"
                height="48"
                viewBox="0 0 48 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect width="48" height="48" stroke="white" />
                <path d="M18.9023 32.236C19.2911 30.7851 20.7825 29.924 22.2335 30.3128C23.6846 30.7016 24.5456 32.193 24.1568 33.644L22.0981 41.3273C21.8794 42.1435 21.0404 42.6278 20.2242 42.4092L17.9253 41.7931C17.1092 41.5745 16.6248 40.7355 16.8435 39.9194L18.9023 32.236Z" fill="#0F74C7" />
                <path d="M28.5027 28.4036C29.5648 27.3414 31.2873 27.3414 32.3494 28.4036L38.1452 34.1994C38.7428 34.7969 38.7428 35.7657 38.1452 36.3631L36.4624 38.046C35.8649 38.6435 34.8962 38.6435 34.2987 38.046L28.5027 32.2501C27.4405 31.188 27.4405 29.4659 28.5027 28.4036Z" fill="#0F74C7" />
                <path d="M14.8047 23.4971C16.2557 23.1083 17.7471 23.9695 18.1359 25.4204C18.5247 26.8714 17.6637 28.363 16.2127 28.7518L8.03407 30.9432C7.21786 31.1619 6.3789 30.6775 6.16019 29.8614L5.54421 27.5624C5.32551 26.7463 5.80987 25.9073 6.62608 25.6887L14.8047 23.4971Z" fill="#0F74C7" />
                <path d="M30.9977 2.18752C31.8139 2.40623 32.2982 3.24518 32.0796 4.06138L26.495 24.9033C26.1062 26.3543 24.6148 27.2153 23.1636 26.8267C21.7127 26.4379 20.8516 24.9463 21.2403 23.4954L26.8248 2.65341C27.0435 1.8372 27.8825 1.35283 28.6987 1.57152L30.9977 2.18752Z" fill="#0F74C7" />
                <path d="M42.6634 20.0812C42.882 20.8973 42.3976 21.7363 41.5815 21.9551L33.508 24.1182C32.0571 24.507 30.5656 23.6459 30.1769 22.195C29.7881 20.7438 30.6491 19.2524 32.1001 18.8636L40.1735 16.7005C40.9897 16.4818 41.8287 16.9661 42.0473 17.7823L42.6634 20.0812Z" fill="#0F74C7" />
                <path d="M19.6489 15.7031C20.7112 16.7653 20.7112 18.4874 19.6489 19.5497C18.5867 20.6119 16.8646 20.6119 15.8024 19.5497L6.22156 9.96888C5.62406 9.37138 5.62406 8.40263 6.22156 7.80514L7.90439 6.12229C8.50191 5.52479 9.47064 5.52479 10.0682 6.12229L19.6489 15.7031Z" fill="#0F74C7" />
              </svg>
              <h1 className="ml-2 font-open-sans text-2xl font-bold italic text-sis-blue sm:ml-3 sm:text-3xl xl:text-[38px] xl:leading-[38px]">SisDisciplinar</h1>
            </div>

            {/* Cabeçalho Principal */}
            <div className="mb-6 text-center sm:mb-8">
              <h2 className="mb-2 font-open-sans text-xl font-bold text-sis-dark-text sm:mb-3 sm:text-2xl xl:text-[30px] xl:leading-9">Acesse sua conta</h2>
              <p className="font-roboto text-sm text-sis-secondary-text sm:text-base xl:leading-6">Bem-vindo de volta ao SisDisciplinar!</p>
            </div>

            {/* Formulário de Login */}
            <form onSubmit={enviarLogin} className="space-y-6">
              <div className="space-y-3.5">
                <label className="block font-roboto text-xs font-medium text-sis-dark-text xl:leading-5">Nome de Usuário</label>
                <input
                  type="text"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  className="w-full rounded-md border border-sis-border bg-white px-3 py-2 font-roboto text-sm text-sis-secondary-text placeholder:text-sis-secondary-text focus:border-sis-blue focus:outline-none focus:ring-1 focus:ring-sis-blue xl:h-[37px] xl:px-3 xl:py-2"
                  placeholder="seu.email@email.com"
                />
              </div>

              <div className="space-y-3.5">
                <label className="block font-roboto text-xs font-medium text-sis-dark-text xl:leading-5">Senha</label>
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full rounded-md border border-sis-border bg-white px-3 py-2 font-roboto text-sm text-sis-secondary-text placeholder:text-sis-secondary-text focus:border-sis-blue focus:outline-none focus:ring-1 focus:ring-sis-blue xl:h-[37px] xl:px-3 xl:py-2"
                  placeholder="•••••••"
                />
              </div>

              <div className="flex justify-end">
                <button type="button" className="font-roboto text-sm font-medium text-sis-secondary-text hover:text-sis-blue focus:outline-none focus:text-sis-blue xl:leading-[22px]">
                  Esqueceu sua senha?
                </button>
              </div>

              <button type="submit" className="w-full rounded-md bg-sis-blue py-2.5 font-roboto text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-sis-blue focus:ring-offset-2 xl:h-[40px] xl:py-2.5">
                Entrar
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Lado Direito - Ilustração */}
      <div className="hidden lg:flex lg:h-full lg:flex-1 xl:w-[720px] xl:flex-none">
        <div className="flex h-screen w-full flex-col items-center justify-center bg-sis-bg-light">
          <img
            src="https://api.builder.io/api/v1/image/assets/TEMP/18fb8f921705a3e5fe1c084d8ea7a2d9adc3172b?width=1440"
            alt="Ilustração justiça"
            className="h-full w-full object-cover opacity-90"
          />
        </div>
      </div>
    </div>
  );
}
