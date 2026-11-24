import { api } from './api'

export function pushSupported() {
  return window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}
function decodeKey(key: string): Uint8Array<ArrayBuffer> {
  const raw=atob((key+'='.repeat((4-key.length%4)%4)).replace(/-/g,'+').replace(/_/g,'/'))
  const bytes=new Uint8Array(raw.length)
  for(let i=0;i<raw.length;i++) bytes[i]=raw.charCodeAt(i)
  return bytes
}
export async function currentPushSubscription() {
  if(!pushSupported()) return null
  const registration=await navigator.serviceWorker.getRegistration('/push-worker.js')
  return registration ? registration.pushManager.getSubscription() : null
}
export async function enablePush() {
  if(!pushSupported()) throw new Error('Este navegador não oferece notificações push neste endereço. Use HTTPS ou localhost.')
  if(Notification.permission==='denied') throw new Error('As notificações estão bloqueadas no navegador. Altere a permissão nas configurações do site.')
  const permission=await Notification.requestPermission()
  if(permission!=='granted') throw new Error('A permissão para notificações não foi concedida.')
  const { publicKey }=await api<{publicKey:string}>('/me/push/key')
  const registration=await navigator.serviceWorker.register('/push-worker.js', {scope:'/'})
  await navigator.serviceWorker.ready
  let subscription=await registration.pushManager.getSubscription()
  let created=false
  if(subscription) {
    const current=subscription.options.applicationServerKey
    const expected=decodeKey(publicKey)
    if(!current || new Uint8Array(current).length!==expected.length || !new Uint8Array(current).every((v,i)=>v===expected[i])) {
      throw new Error('A chave de notificações mudou. Desative as notificações neste dispositivo e ative novamente.')
    }
  } else { subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodeKey(publicKey)});created=true }
  try { await api('/me/push/subscriptions',{method:'POST',body:JSON.stringify(subscription.toJSON())}) }
  catch(error) { if(created) await subscription.unsubscribe(); throw error }
}
export async function disablePush() {
  const subscription=await currentPushSubscription()
  if(!subscription) return
  await api('/me/push/subscriptions',{method:'DELETE',body:JSON.stringify({endpoint:subscription.endpoint})})
  if(!await subscription.unsubscribe()) throw new Error('Não foi possível remover a assinatura do navegador.')
}
