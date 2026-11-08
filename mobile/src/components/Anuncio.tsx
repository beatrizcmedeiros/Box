import type { ReactNode } from 'react'
import { useState } from 'react'
import { View } from 'react-native'
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads'
import { useOnline } from '../lib/cacheOffline'

/**
 * Bloco de banner do AdMob. Só o build da loja (perfil "production" do eas.json) recebe o ID
 * real; nos demais (APK de teste, desenvolvimento) aparecem anúncios de teste do Google, para
 * ninguém tocar nos anúncios reais durante os testes (o AdMob pode bloquear a conta).
 */
const ID_BANNER = process.env.EXPO_PUBLIC_ADMOB_BANNER_ID || TestIds.ADAPTIVE_BANNER

/** Banner fixo no rodapé, sem cobrir a tela. Some sem internet ou se não houver anúncio. */
export function BannerRodape() {
  const online = useOnline()
  const [falhou, setFalhou] = useState(false)
  if (!online || falhou) return null
  return (
    <View style={{ alignItems: 'center', backgroundColor: '#f6f8fb' }}>
      <BannerAd
        unitId={ID_BANNER}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdFailedToLoad={() => setFalhou(true)}
      />
    </View>
  )
}

/** Envolve cada tela das abas: o conteúdo em cima e o banner logo acima do menu de abas. */
export function ComBannerNoRodape({ children }: { children: ReactNode }) {
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>{children}</View>
      <BannerRodape />
    </View>
  )
}
