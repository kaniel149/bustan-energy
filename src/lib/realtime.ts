import { useEffect } from 'react'
import { supabase } from './supabase'
import { getCrmProjects } from './crm-service'
import { useAppStore } from './store'

export function useRealtimeSync() {
  const user = useAppStore((s) => s.user)
  const setCrmProjects = useAppStore((s) => s.setCrmProjects)

  useEffect(() => {
    if (!supabase || !user) return

    const channel = supabase
      .channel('platform-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'crm_projects' },
        async () => {
          const projects = await getCrmProjects()
          setCrmProjects(projects)
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activity_log' },
        async () => {
          const projects = await getCrmProjects()
          setCrmProjects(projects)
        }
      )
      .subscribe()

    return () => {
      supabase!.removeChannel(channel)
    }
  }, [user, setCrmProjects])
}
