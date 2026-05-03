import {z} from 'zod'

export const RegisterBodySchema = z.object({
    email: z.email(),
    password: z.string().min(6)

});

export const LoginBodySchema = z.object({
    email: z.email(),
    password: z.string()

});