import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { joinSession, getParticipant, saveAvailability } from '../services/api.js'

const STORAGE_KEY_PREFIX = 'zamanla_participant_'

export function getStoredEditToken(publicToken) {
  try {
    return localStorage.getItem(`${STORAGE_KEY_PREFIX}${publicToken}`)
  } catch {
    return null
  }
}

export function storeEditToken(publicToken, editToken) {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${publicToken}`, editToken)
  } catch {
    // ignore storage errors
  }
}

export function clearStoredEditToken(publicToken) {
  try {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${publicToken}`)
  } catch {
    // ignore
  }
}

export function useParticipant(publicToken, editToken) {
  return useQuery({
    queryKey: ['participant', publicToken, editToken],
    queryFn: () => getParticipant(publicToken, editToken),
    enabled: !!publicToken && !!editToken,
    retry: (failureCount, error) => {
      // Don't retry 404 — editToken may be invalid
      if (error?.response?.status === 404) return false
      return failureCount < 2
    },
  })
}

export function useJoinSession(publicToken) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => joinSession(publicToken, data),
    onSuccess: (participant) => {
      storeEditToken(publicToken, participant.editToken)
      queryClient.setQueryData(
        ['participant', publicToken, participant.editToken],
        participant
      )
    },
  })
}

export function useSaveAvailability(publicToken, editToken) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => saveAvailability(publicToken, editToken, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['participant', publicToken, editToken], updated)
      // Invalidate results so the group view refreshes
      queryClient.invalidateQueries({ queryKey: ['results', publicToken] })
    },
  })
}
