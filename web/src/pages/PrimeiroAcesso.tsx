import { Link, useNavigate } from 'react-router'
import { rotaInicial, useAceitarTermo, useLogout } from '../auth/sessao.ts'
import { LayoutPublico } from '../components/LayoutPublico.tsx'
import { Alerta, Botao } from '../components/ui.tsx'

export function Termo() {
  const aceitar = useAceitarTermo()
  const logout = useLogout()
  const navegar = useNavigate()

  return (
    <LayoutPublico subtitulo="Termo de consentimento para uso dos dados">
      <article className="space-y-3 rounded-2xl bg-white p-5 text-sm leading-relaxed text-slate-700 shadow-sm">
        <h2 className="text-base font-bold text-slate-900">Como o PR Box usa seus dados</h2>
        <p>
          Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), informamos que
          o PR Box armazena apenas os dados necessários para o seu funcionamento:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>nome, e-mail e turma, para identificar você no box;</li>
          <li>
            exercícios, datas dos testes de carga e cargas máximas (PRs), para calcular as cargas
            dos treinos.
          </li>
        </ul>
        <p>
          Esses dados são visíveis apenas para você e para as academias e professores aos quais você
          se vincular, não são compartilhados com terceiros e a senha é armazenada de forma
          criptografada.
        </p>
        <p>
          Você pode corrigir ou excluir os seus dados a qualquer momento no seu perfil, e desfazer
          os vínculos com academias e professores quando quiser. A exclusão remove definitivamente
          sua conta e seu histórico de testes.
        </p>
        <p>
          <Link to="/privacidade" className="font-semibold text-marca-escura underline">
            Ler a política de privacidade completa
          </Link>
        </p>
      </article>
      {aceitar.error && (
        <div className="mt-4">
          <Alerta>{aceitar.error.message}</Alerta>
        </div>
      )}
      <div className="mt-5 space-y-3">
        <Botao
          className="w-full"
          carregando={aceitar.isPending}
          onClick={() =>
            aceitar.mutate(undefined, {
              onSuccess: ({ usuario }) => navegar(rotaInicial(usuario), { replace: true }),
            })
          }
        >
          Li e aceito
        </Botao>
        <Botao variante="link" className="w-full" onClick={() => logout.mutate()}>
          Não aceito — sair
        </Botao>
      </div>
    </LayoutPublico>
  )
}
