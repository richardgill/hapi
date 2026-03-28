import { useQuery } from '@tanstack/react-query'
import type { ApiClient } from '@/api/client'
import type { TmuxSession } from '@/types/api'
import { queryKeys } from '@/lib/query-keys'

export const useTmuxSessions = (api: ApiClient | null, machineId: string | null) => {
    const query = useQuery({
        queryKey: queryKeys.tmuxSessions(machineId ?? ''),
        queryFn: async () => {
            if (!api || !machineId) throw new Error('unavailable')
            return await api.getTmuxSessions(machineId)
        },
        enabled: Boolean(api && machineId),
        refetchInterval: 10_000,
    })

    return {
        tmuxSessions: query.data?.sessions ?? [] as TmuxSession[],
        isLoading: query.isLoading,
    }
}
