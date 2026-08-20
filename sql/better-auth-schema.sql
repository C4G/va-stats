-- Better Auth 1.7 core schema plus @better-auth/passkey 1.7.
-- Apply this to the same MySQL database used by VA-STATS before deploying the
-- Better Auth release. Existing application tables, including vausers, are
-- intentionally left unchanged.

CREATE TABLE IF NOT EXISTS `user` (
  `id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `emailVerified` BOOLEAN NOT NULL DEFAULT FALSE,
  `image` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `session` (
  `id` VARCHAR(36) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `token` VARCHAR(255) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `ipAddress` VARCHAR(255) NULL,
  `userAgent` TEXT NULL,
  `userId` VARCHAR(36) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `session_token_unique` (`token`),
  KEY `session_userId_idx` (`userId`),
  CONSTRAINT `session_userId_fk` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `account` (
  `id` VARCHAR(36) NOT NULL,
  `issuer` VARCHAR(255) NOT NULL,
  `accountId` VARCHAR(255) NOT NULL,
  `providerId` VARCHAR(255) NOT NULL,
  `userId` VARCHAR(36) NOT NULL,
  `accessToken` TEXT NULL,
  `refreshToken` TEXT NULL,
  `idToken` TEXT NULL,
  `accessTokenExpiresAt` DATETIME(3) NULL,
  `refreshTokenExpiresAt` DATETIME(3) NULL,
  `scope` TEXT NULL,
  `password` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `account_issuer_accountId_unique` (`issuer`, `accountId`),
  KEY `account_userId_idx` (`userId`),
  CONSTRAINT `account_userId_fk` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `verification` (
  `id` VARCHAR(36) NOT NULL,
  `identifier` VARCHAR(255) NOT NULL,
  `value` TEXT NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `verification_identifier_idx` (`identifier`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `passkey` (
  `id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(255) NULL,
  `publicKey` TEXT NOT NULL,
  `userId` VARCHAR(36) NOT NULL,
  `credentialID` VARCHAR(255) NOT NULL,
  `counter` BIGINT NOT NULL,
  `deviceType` VARCHAR(255) NOT NULL,
  `backedUp` BOOLEAN NOT NULL,
  `transports` VARCHAR(255) NULL,
  `createdAt` DATETIME(3) NULL,
  `aaguid` VARCHAR(255) NULL,
  PRIMARY KEY (`id`),
  KEY `passkey_userId_idx` (`userId`),
  KEY `passkey_credentialID_idx` (`credentialID`),
  CONSTRAINT `passkey_userId_fk` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
