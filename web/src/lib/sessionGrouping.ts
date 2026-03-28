import type { SessionSummary, TmuxSession } from '@/types/api'

export type SessionGroup = {
    key: string
    displayName: string
    sessions: SessionSummary[]
    hasActiveSession: boolean
    tmuxAttached: boolean
    lastAttached: number
    directory: string
    machineId: string | null
}

const getSessionPath = (s: SessionSummary): string =>
    s.metadata?.worktree?.basePath ?? s.metadata?.path ?? 'Other'

const sortSessions = (sessions: SessionSummary[]): SessionSummary[] =>
    [...sessions].sort((a, b) => {
        const rankA = a.active ? (a.pendingRequestsCount > 0 ? 0 : 1) : 2
        const rankB = b.active ? (b.pendingRequestsCount > 0 ? 0 : 1) : 2
        if (rankA !== rankB) return rankA - rankB
        return b.updatedAt - a.updatedAt
    })

const getDisplayName = (dir: string): string => {
    if (dir === 'Other') return dir
    const parts = dir.split(/[\\/]+/).filter(Boolean)
    if (parts.length === 0) return dir
    if (parts.length === 1) return parts[0]
    return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`
}

const makeDirGroup = (dir: string, sessions: SessionSummary[]): SessionGroup => ({
    key: `dir:${dir}`,
    displayName: getDisplayName(dir),
    sessions: sortSessions(sessions),
    hasActiveSession: sessions.some(s => s.active),
    tmuxAttached: false,
    lastAttached: 0,
    directory: dir,
    machineId: sessions.find(s => s.metadata?.machineId)?.metadata?.machineId ?? null,
})

export const groupByTmuxSessions = (
    sessions: SessionSummary[],
    tmuxSessions: TmuxSession[],
    machineId: string | null
): SessionGroup[] => {
    const claimed = new Set<string>()
    const groups: SessionGroup[] = []

    for (const ts of tmuxSessions) {
        const allPaths = new Set([ts.path, ...ts.panePaths])
        const matched = sessions.filter(s => {
            if (claimed.has(s.id)) return false
            const actualPath = s.metadata?.path ?? 'Other'
            return allPaths.has(actualPath) || ts.panePaths.some(pp => actualPath.startsWith(`${pp}/`) || pp.startsWith(`${actualPath}/`))
        })
        matched.forEach(s => claimed.add(s.id))

        groups.push({
            key: `tmux:${ts.name}`,
            displayName: ts.name,
            sessions: sortSessions(matched),
            hasActiveSession: matched.some(s => s.active),
            tmuxAttached: ts.attached,
            lastAttached: ts.lastAttached,
            directory: ts.path,
            machineId,
        })
    }

    const unclaimed = sessions.filter(s => !claimed.has(s.id))
    if (unclaimed.length > 0) {
        const byDir = new Map<string, SessionSummary[]>()
        for (const s of unclaimed) {
            const p = getSessionPath(s)
            if (!byDir.has(p)) byDir.set(p, [])
            byDir.get(p)!.push(s)
        }
        for (const [dir, dirSessions] of byDir) {
            groups.push(makeDirGroup(dir, dirSessions))
        }
    }

    return groups
}

export const groupByDirectory = (sessions: SessionSummary[]): SessionGroup[] => {
    const byDir = new Map<string, SessionSummary[]>()
    for (const s of sessions) {
        const p = getSessionPath(s)
        if (!byDir.has(p)) byDir.set(p, [])
        byDir.get(p)!.push(s)
    }

    return Array.from(byDir.entries())
        .map(([dir, dirSessions]) => makeDirGroup(dir, dirSessions))
        .sort((a, b) => {
            if (a.hasActiveSession !== b.hasActiveSession) return a.hasActiveSession ? -1 : 1
            const aLatest = a.sessions[0]?.updatedAt ?? 0
            const bLatest = b.sessions[0]?.updatedAt ?? 0
            return bLatest - aLatest
        })
}

export const groupSessions = (
    sessions: SessionSummary[],
    tmuxSessions: TmuxSession[] | undefined,
    machineId: string | null
): SessionGroup[] => {
    if (tmuxSessions && tmuxSessions.length > 0) {
        return groupByTmuxSessions(sessions, tmuxSessions, machineId)
    }
    return groupByDirectory(sessions)
}
