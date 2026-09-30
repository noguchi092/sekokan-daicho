import {sqliteTable,text} from 'drizzle-orm/sqlite-core';
export const records=sqliteTable('records',{id:text('id').primaryKey(),kind:text('kind').notNull(),data:text('data').notNull(),updatedAt:text('updated_at').notNull()});
export const audit=sqliteTable('audit',{id:text('id').primaryKey(),action:text('action').notNull(),createdAt:text('created_at').notNull()});
export const admins=sqliteTable('admins',{id:text('id').primaryKey(),login:text('login').notNull(),passwordHash:text('password_hash').notNull(),salt:text('salt').notNull()});
export const sessions=sqliteTable('sessions',{tokenHash:text('token_hash').primaryKey(),expiresAt:text('expires_at').notNull()});
export const attempts=sqliteTable('login_attempts',{bucket:text('bucket').primaryKey(),count:text('count').notNull(),windowStart:text('window_start').notNull()});
