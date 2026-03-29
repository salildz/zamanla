import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getSession,
  getAdminSession,
  updateAdminSession,
  deleteSession,
  closeSession,
  claimSession,
  getResults,
  getMySchedules,
} from '../services/api.js'

export function useSession(publicToken) {
  return useQuery({
    queryKey: ['session', publicToken],
    queryFn: () => getSession(publicToken),
    enabled: !!publicToken,
  })
}

export function useAdminSession(adminToken) {
  return useQuery({
    queryKey: ['adminSession', adminToken],
    queryFn: () => getAdminSession(adminToken),
    enabled: !!adminToken,
  })
}

export function useUpdateSession(adminToken) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => updateAdminSession(adminToken, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['adminSession', adminToken], updated)
    },
  })
}

export function useDeleteSession(adminToken) {
  return useMutation({
    mutationFn: () => deleteSession(adminToken),
  })
}

export function useCloseSession(adminToken) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => closeSession(adminToken),
    onSuccess: (updated) => {
      queryClient.setQueryData(['adminSession', adminToken], updated)
    },
  })
}

export function useClaimSession(adminToken) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => claimSession(adminToken),
    onSuccess: (updated) => {
      queryClient.setQueryData(['adminSession', adminToken], updated)
      queryClient.invalidateQueries({ queryKey: ['mySchedules'] })
    },
  })
}

export function useMySchedules(options = {}) {
  return useQuery({
    queryKey: ['mySchedules'],
    queryFn: getMySchedules,
    ...options,
  })
}

export function useResults(publicToken, options = {}) {
  return useQuery({
    queryKey: ['results', publicToken],
    queryFn: () => getResults(publicToken),
    enabled: !!publicToken,
    refetchInterval: options.refetchInterval,
  })
}
