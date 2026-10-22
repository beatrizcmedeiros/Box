import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { LayoutPublico } from '../components/LayoutPublico.tsx'

// E-mail de contato do responsável pelos dados (definido no deploy da Vercel).
// A Google Play exige um canal de contato na política de privacidade.
const CONTATO: string | undefined = import.meta.env.VITE_CONTATO_PRIVACIDADE

const ATUALIZADA_EM = '23/10/2026'

function Contato() {
  return CONTATO ? (
    <a href={`mailto:${CONTATO}`} className="font-semibold text-marca-escura underline">
      {CONTATO}
    </a>
  ) : (
    <>o responsável pelo PR Box</>
  )
}

function Documento({ children }: { children: ReactNode }) {
  return (
    <article className="space-y-3 rounded-2xl bg-white p-5 text-sm leading-relaxed text-slate-700 shadow-sm [&_h2]:pt-2 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-slate-900 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
      {children}
      <p className="pt-2 text-xs text-slate-500">Última atualização: {ATUALIZADA_EM}</p>
    </article>
  )
}

function Voltar() {
  return (
    <p className="mt-5 text-center">
      <Link to="/" className="text-sm font-semibold text-marca-escura underline">
        Voltar ao PR Box
      </Link>
    </p>
  )
}

/** Política de privacidade pública (link exigido na ficha da Google Play). */
export function Privacidade() {
  return (
    <LayoutPublico subtitulo="Política de privacidade">
      <Documento>
        <p>
          O PR Box é um aplicativo para quem treina cross training: a pessoa registra os próprios
          recordes (PRs) e vê as cargas de treino por percentual; academias e professores acompanham
          os alunos que se vincularem a eles. Esta política explica quais dados são tratados,
          conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
        </p>

        <h2>Dados coletados</h2>
        <ul>
          <li>
            <strong>Conta:</strong> nome, e-mail e senha (guardada apenas de forma criptografada,
            com scrypt). Na conta da academia, o nome da academia.
          </li>
          <li>
            <strong>Treino:</strong> exercícios, datas dos testes de carga e cargas máximas (PRs),
            registrados pela própria pessoa ou lançados por um professor ou academia a que ela se
            vinculou.
          </li>
          <li>
            <strong>Vínculos e organização:</strong> as academias e professores a que a pessoa se
            vinculou e, dentro de cada vínculo, a turma e os apelidos usados nas listas de teste.
          </li>
          <li>
            <strong>Acesso:</strong> sessões de login e códigos de confirmação enviados por e-mail.
          </li>
        </ul>
        <p>
          O aplicativo <strong>não</strong> coleta localização, contatos, fotos, identificadores de
          publicidade nem dados de pagamento, e não usa ferramentas de análise ou anúncios. O PDF do
          teste de força importado pelo professor é lido no próprio aparelho e não é enviado ao
          servidor.
        </p>

        <h2>Quem vê os seus dados</h2>
        <p>
          Os seus PRs são seus. Só passam a ser vistos por uma academia (e pelos professores dela)
          ou por um professor quando <strong>você mesmo</strong> digita o código de vínculo deles.
          Você pode desfazer qualquer vínculo a qualquer momento, na aba Vínculos: quem perdeu o
          vínculo deixa de ver os seus PRs na hora.
        </p>

        <h2>Como os dados são usados</h2>
        <p>
          Exclusivamente para o funcionamento do aplicativo: calcular as cargas de treino, mostrar a
          evolução, enviar os códigos de confirmação e de nova senha e permitir que as academias e
          professores vinculados acompanhem os seus alunos.
        </p>

        <h2>Compartilhamento</h2>
        <p>
          Os dados não são vendidos nem compartilhados com terceiros. Eles ficam em provedores
          contratados para hospedar o serviço (servidor da aplicação, banco de dados e envio de
          e-mails), sempre com conexão criptografada (HTTPS/TLS).
        </p>

        <h2>Dados guardados no aparelho</h2>
        <p>
          Para funcionar sem internet no box, o aplicativo guarda no celular uma cópia dos dados
          mostrados nas telas. Essa cópia é apagada quando você sai da conta.
        </p>

        <h2>Seus direitos</h2>
        <p>
          Você pode consultar e corrigir os seus dados no aplicativo, desfazer vínculos e{' '}
          <Link to="/excluir-conta" className="font-semibold text-marca-escura underline">
            excluir a sua conta
          </Link>{' '}
          a qualquer momento. Dúvidas ou solicitações: <Contato />.
        </p>
      </Documento>
      <Voltar />
    </LayoutPublico>
  )
}

/** Instruções públicas de exclusão de conta (link exigido pela Google Play). */
export function InstrucoesExcluirConta() {
  return (
    <LayoutPublico subtitulo="Excluir a sua conta e os seus dados">
      <Documento>
        <h2>Pelo aplicativo ou pela web</h2>
        <ul>
          <li>Entre no PR Box com o seu e-mail e senha.</li>
          <li>
            Abra <strong>Perfil</strong>.
          </li>
          <li>
            Toque em <strong>Excluir minha conta</strong>, confirme com a sua senha e toque em{' '}
            <strong>Excluir</strong>.
          </li>
        </ul>

        <h2>Sem acesso à conta</h2>
        <p>
          Use <strong>Esqueci a senha</strong> na tela de entrada para criar uma nova senha, ou peça
          a exclusão a <Contato />, informando o e-mail da conta. A exclusão é feita em até 15 dias.
        </p>

        <h2>O que é apagado</h2>
        <ul>
          <li>a sua conta (nome, e-mail e senha) e as sessões em todos os aparelhos;</li>
          <li>todos os seus PRs e o histórico de testes de carga;</li>
          <li>os seus vínculos com academias e professores (e a turma e apelidos neles).</li>
        </ul>
        <p>
          Na conta da academia, a exclusão desfaz os vínculos, turmas e códigos da academia; os PRs
          continuam com os próprios alunos. A exclusão é imediata e definitiva no sistema. Cópias de
          segurança do banco de dados são substituídas automaticamente e deixam de conter os seus
          dados em até 30 dias.
        </p>
      </Documento>
      <Voltar />
    </LayoutPublico>
  )
}
