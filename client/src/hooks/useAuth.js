import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getCurrentUser, loginUser, logoutUser, registerUser } from '../services/api.js'

export const AUTH_QUERY_KEY = ['auth', 'currentUser']

export function useCurrentUser(options = {}) {
  return useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: getCurrentUser,
    ...options,
  })
}

export function useRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: registerUser,
    onSuccess: (user) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, user)
      queryClient.invalidateQueries({ queryKey: ['mySchedules'] })
    },
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: loginUser,
    onSuccess: (user) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, user)
      queryClient.invalidateQueries({ queryKey: ['mySchedules'] })
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: logoutUser,
    onSuccess: () => {
      queryClient.setQueryData(AUTH_QUERY_KEY, null)
      queryClient.removeQueries({ queryKey: ['mySchedules'] })
    },
  })
}
