/**
 * User Repository
 *
 * Persistencia de usuarios usando tabla propia (no Supabase Auth).
 * Gestiona registro, login y CRUD de usuarios.
 */

import { getSupabaseClient, safeQuery } from '../client';
import type { DbUser, DbUserRole } from '../../../types/database';
import type { SupabaseClient } from '../client';

// ===========================================
// Types
// ===========================================

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  role: DbUserRole;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  name?: string;
  avatar?: string;
  role?: DbUserRole;
}

export interface UpdateUserInput {
  name?: string;
  avatar?: string;
  role?: DbUserRole;
  isActive?: boolean;
  emailVerified?: boolean;
}

// ===========================================
// Type Mappers
// ===========================================

function fromDbUser(db: DbUser): User {
  return {
    id: db.id,
    email: db.email,
    name: db.name,
    avatar: db.avatar,
    role: db.role,
    isActive: db.is_active,
    emailVerified: db.email_verified,
    lastLoginAt: db.last_login_at,
    createdAt: db.created_at,
  };
}

function toDbUserInput(input: CreateUserInput): Omit<DbUser, 'id' | 'created_at' | 'updated_at' | 'last_login_at'> {
  return {
    email: input.email,
    password_hash: input.passwordHash,
    name: input.name || null,
    avatar: input.avatar || null,
    role: input.role || 'user',
    is_active: true,
    email_verified: false,
  };
}

// ===========================================
// Repository Functions
// ===========================================

/**
 * Verifica si la tabla users está disponible
 */
export async function isUserRepositoryAvailable(): Promise<boolean> {
  const client = await getSupabaseClient();
  if (!client) {
    console.log('[👤 UserRepository] FALLBACK: Supabase no disponible');
    return false;
  }

  try {
    const { error } = await client
      .from('users')
      .select('id', { count: 'exact', head: true });

    if (error) {
      console.log('[👤 UserRepository] FALLBACK: Error verificando tabla users:', error.message);
      return false;
    }

    console.log('[👤 UserRepository] ✅ DB: Tabla users disponible');
    return true;
  } catch {
    return false;
  }
}

/**
 * Busca un usuario por email (incluye password_hash para validación)
 */
export async function getUserByEmailWithPassword(email: string): Promise<DbUser | null> {
  return safeQuery(async (client) => {
    const { data, error } = await client
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows found
      console.error('[UserRepository] Error fetching user by email:', error);
      return null;
    }

    return data as DbUser;
  }, null);
}

/**
 * Busca un usuario por ID (sin password_hash)
 */
export async function getUserById(id: string): Promise<User | null> {
  return safeQuery(async (client) => {
    const { data, error } = await client
      .from('users')
      .select('id, email, name, avatar, role, is_active, email_verified, last_login_at, created_at, updated_at')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error('[UserRepository] Error fetching user by id:', error);
      return null;
    }

    return fromDbUser(data as DbUser);
  }, null);
}

/**
 * Crea un nuevo usuario
 */
export async function createUser(input: CreateUserInput): Promise<User | null> {
  return safeQuery(async (client) => {
    const dbInput = toDbUserInput(input);

    const { data, error } = await client
      .from('users')
      .insert(dbInput)
      .select('id, email, name, avatar, role, is_active, email_verified, last_login_at, created_at, updated_at')
      .single();

    if (error) {
      console.error('[UserRepository] Error creating user:', error);
      return null;
    }

    console.log('👤 [UserRepository] User created:', (data as DbUser).email);
    return fromDbUser(data as DbUser);
  }, null);
}

/**
 * Actualiza el timestamp de último login
 */
export async function updateLastLogin(userId: string): Promise<boolean> {
  return safeQuery(async (client) => {
    const { error } = await client
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) {
      console.error('[UserRepository] Error updating last login:', error);
      return false;
    }

    return true;
  }, false);
}

/**
 * Actualiza datos de un usuario
 */
export async function updateUser(userId: string, input: UpdateUserInput): Promise<User | null> {
  return safeQuery(async (client) => {
    const updateData: Partial<DbUser> = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.avatar !== undefined) updateData.avatar = input.avatar;
    if (input.role !== undefined) updateData.role = input.role;
    if (input.isActive !== undefined) updateData.is_active = input.isActive;
    if (input.emailVerified !== undefined) updateData.email_verified = input.emailVerified;

    const { data, error } = await client
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select('id, email, name, avatar, role, is_active, email_verified, last_login_at, created_at, updated_at')
      .single();

    if (error) {
      console.error('[UserRepository] Error updating user:', error);
      return null;
    }

    console.log('👤 [UserRepository] User updated:', userId);
    return fromDbUser(data as DbUser);
  }, null);
}

/**
 * Actualiza el password de un usuario
 */
export async function updatePassword(userId: string, passwordHash: string): Promise<boolean> {
  return safeQuery(async (client) => {
    const { error } = await client
      .from('users')
      .update({ password_hash: passwordHash })
      .eq('id', userId);

    if (error) {
      console.error('[UserRepository] Error updating password:', error);
      return false;
    }

    console.log('🔐 [UserRepository] Password updated for user:', userId);
    return true;
  }, false);
}

/**
 * Elimina (desactiva) un usuario
 */
export async function deactivateUser(userId: string): Promise<boolean> {
  return safeQuery(async (client) => {
    const { error } = await client
      .from('users')
      .update({ is_active: false })
      .eq('id', userId);

    if (error) {
      console.error('[UserRepository] Error deactivating user:', error);
      return false;
    }

    console.log('🗑️ [UserRepository] User deactivated:', userId);
    return true;
  }, false);
}

/**
 * Lista todos los usuarios activos (solo admin)
 */
export async function listUsers(): Promise<User[]> {
  return safeQuery(async (client) => {
    const { data, error } = await client
      .from('users')
      .select('id, email, name, avatar, role, is_active, email_verified, last_login_at, created_at, updated_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[UserRepository] Error listing users:', error);
      return [];
    }

    return (data || []).map(fromDbUser);
  }, []);
}

/**
 * Verifica si un email ya está registrado
 */
export async function isEmailTaken(email: string): Promise<boolean> {
  return safeQuery(async (client) => {
    const { data, error } = await client
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (error) {
      console.error('[UserRepository] Error checking email:', error);
      return false;
    }

    return !!data;
  }, false);
}
