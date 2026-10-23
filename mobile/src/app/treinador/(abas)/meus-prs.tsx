import { Redirect } from 'expo-router'

/**
 * Aba "Meus PRs" da gestão: o toque abre a área do aluno (ver o _layout das abas).
 * Se a rota for aberta direto, leva para lá também.
 */
export default function MeusPrs() {
  return <Redirect href="/" />
}
