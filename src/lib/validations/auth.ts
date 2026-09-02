import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Ingresa un correo válido"),
  password: z.string().min(1, "Ingresa tu contraseña"),
});

export const registroSchema = z
  .object({
    nombre: z.string().min(2, "Ingresa tu nombre completo"),
    email: z.email("Ingresa un correo válido"),
    password: z.string().min(8, "Mínimo 8 caracteres"),
    confirmarPassword: z.string(),
    plan: z.enum(["individual", "clinica"]),
    nombreOrganizacion: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmarPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmarPassword"],
  })
  .refine((data) => data.plan !== "clinica" || (data.nombreOrganizacion?.trim().length ?? 0) >= 2, {
    message: "Ingresa el nombre de tu consulta o clínica",
    path: ["nombreOrganizacion"],
  });

export const recuperarSchema = z.object({
  email: z.email("Ingresa un correo válido"),
});

export const actualizarPasswordSchema = z
  .object({
    password: z.string().min(8, "Mínimo 8 caracteres"),
    confirmarPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmarPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmarPassword"],
  });