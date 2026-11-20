-- Migración idempotente para GEMA-Cinemático en db_ad0a4f_gema (SQL Server)
-- 1) Reemplaza UNIQUE(Usuario) global por UNIQUE(SistemaID, Usuario) en auth.Usuarios
-- 2) Registra sistema 'cinematico', roles ('admin', 'usuario') y usuario ADMIN protegido
-- 3) Crea tabla auth.LogsAcceso para auditoría de accesos y actividad

SET NOCOUNT ON;
SET XACT_ABORT ON;

IF DB_NAME() <> N'db_ad0a4f_gema'
    THROW 52000, 'Seleccione la base de datos db_ad0a4f_gema.', 1;

IF OBJECT_ID(N'auth.Sistemas', N'U') IS NULL
   OR OBJECT_ID(N'auth.Roles', N'U') IS NULL
   OR OBJECT_ID(N'auth.Usuarios', N'U') IS NULL
    THROW 52001, 'Faltan las tablas base del esquema auth.', 1;

BEGIN TRY
    BEGIN TRANSACTION;

    -- 1. Reemplazar constraint UNIQUE de una sola columna sobre auth.Usuarios(Usuario)
    DECLARE @usuarioUnique sysname;
    SELECT @usuarioUnique = kc.name
    FROM sys.key_constraints kc
    JOIN sys.index_columns ic
      ON ic.object_id = kc.parent_object_id
     AND ic.index_id = kc.unique_index_id
     AND ic.key_ordinal = 1
    JOIN sys.columns c
      ON c.object_id = ic.object_id
     AND c.column_id = ic.column_id
    WHERE kc.parent_object_id = OBJECT_ID(N'auth.Usuarios')
      AND kc.type = 'UQ'
      AND c.name = N'Usuario'
      AND NOT EXISTS (
          SELECT 1
          FROM sys.index_columns x
          WHERE x.object_id = ic.object_id
            AND x.index_id = ic.index_id
            AND x.key_ordinal > 1
      );

    IF @usuarioUnique IS NOT NULL
    BEGIN
        DECLARE @dropSql nvarchar(max) = N'ALTER TABLE auth.Usuarios DROP CONSTRAINT ' + QUOTENAME(@usuarioUnique) + N';';
        EXEC sys.sp_executesql @dropSql;
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.key_constraints
        WHERE parent_object_id = OBJECT_ID(N'auth.Usuarios')
          AND name = N'UQ_AuthUsuarios_SistemaUsuario'
    )
    BEGIN
        EXEC sys.sp_executesql N'
            ALTER TABLE auth.Usuarios
            ADD CONSTRAINT UQ_AuthUsuarios_SistemaUsuario UNIQUE (SistemaID, Usuario);
        ';
    END;

    -- 2. Registrar sistema 'cinematico'
    DECLARE @sysId int = (SELECT SistemaID FROM auth.Sistemas WHERE Codigo = N'cinematico');
    IF @sysId IS NULL
    BEGIN
        INSERT INTO auth.Sistemas (Codigo, Nombre, Estado)
        VALUES (N'cinematico', N'GEMA-Cinemático', 'A');
        SET @sysId = SCOPE_IDENTITY();
    END;

    -- 3. Crear roles para 'cinematico'
    IF NOT EXISTS (SELECT 1 FROM auth.Roles WHERE SistemaID = @sysId AND Nombre = N'admin')
    BEGIN
        INSERT INTO auth.Roles (SistemaID, Nombre, Descripcion, Estado, EsProtegido)
        VALUES (@sysId, N'admin', N'Administrador de cuentas y auditoría de Análisis Cinemático.', 'A', 1);
    END;

    IF NOT EXISTS (SELECT 1 FROM auth.Roles WHERE SistemaID = @sysId AND Nombre = N'usuario')
    BEGIN
        INSERT INTO auth.Roles (SistemaID, Nombre, Descripcion, Estado, EsProtegido)
        VALUES (@sysId, N'usuario', N'Usuario operativo de Análisis Cinemático.', 'A', 0);
    END;

    DECLARE @adminRolId int = (SELECT RolID FROM auth.Roles WHERE SistemaID = @sysId AND Nombre = N'admin');

    -- 4. Crear cuenta ADMIN protegida para 'cinematico' (clave inicial: Admin2026!)
    IF NOT EXISTS (SELECT 1 FROM auth.Usuarios WHERE SistemaID = @sysId AND Usuario = N'ADMIN')
    BEGIN
        INSERT INTO auth.Usuarios (
            SistemaID, EsProtegido, VersionSeguridad,
            Usuario, Email, ContrasenaHash, NombreCompleto,
            RolID, Estado, UsuarioRegistro
        )
        VALUES (
            @sysId, 1, 0,
            N'ADMIN',
            N'admin.cinematico@gema.com',
            N'$2b$12$Y89zKo06HBqiD6cu/S5ilOMPnsER8rG0eJ4Oosmlji8xxksOWzuKq',
            N'Administrador Cinemático',
            @adminRolId,
            'A',
            N'MIGRATION'
        );
    END;

    -- 5. Crear tabla de auditoría auth.LogsAcceso
    IF OBJECT_ID(N'auth.LogsAcceso', N'U') IS NULL
    BEGIN
        EXEC sys.sp_executesql N'
            CREATE TABLE auth.LogsAcceso (
                LogID INT IDENTITY(1,1) PRIMARY KEY,
                SistemaID INT NOT NULL REFERENCES auth.Sistemas(SistemaID),
                UsuarioID INT NULL REFERENCES auth.Usuarios(UsuarioID),
                Usuario NVARCHAR(50) NOT NULL,
                Accion NVARCHAR(50) NOT NULL,
                Detalle NVARCHAR(500) NULL,
                DireccionIP NVARCHAR(64) NULL,
                UserAgent NVARCHAR(255) NULL,
                FechaHora DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
            );
            CREATE INDEX IX_AuthLogsAcceso_SistemaFecha
                ON auth.LogsAcceso (SistemaID, FechaHora DESC);
        ';
    END;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;
    THROW;
END CATCH;
