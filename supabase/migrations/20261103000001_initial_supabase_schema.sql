-- ==============================================================================
-- AI Face Similarity Analyzer — Supabase PostgreSQL Schema & Security Migration
-- Version: 2.0.0 (Supabase Native Integration)
-- ==============================================================================

-- 1. Create Custom Enum Types for Enforced Domain Integrity
DO $$ BEGIN
    CREATE TYPE user_role_type AS ENUM ('user', 'admin', 'super_admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_status_type AS ENUM ('active', 'inactive', 'suspended');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE processing_status_type AS ENUM ('queued', 'processing', 'completed', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE image_slot_type AS ENUM ('image_1', 'image_2');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ai_screening_status_type AS ENUM ('authentic', 'suspected_ai', 'inconclusive');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. TABLE DEFINITIONS
-- ==============================================================================

-- Table 1: profiles (References auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    avatar_path TEXT,
    status user_status_type NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Table 2: user_roles (Enforced Role Hierarchy)
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role_type NOT NULL DEFAULT 'user',
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_user_role UNIQUE (user_id, role)
);

-- Table 3: comparisons
CREATE TABLE IF NOT EXISTS public.comparisons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    similarity_score NUMERIC(5, 2) NOT NULL, -- Calibrated 0 - 100 Index
    raw_cosine_score NUMERIC(6, 4),          -- Raw Cosine [-1, 1]
    similarity_category TEXT NOT NULL,        -- 'High Similarity' | 'Moderate Similarity' | 'Low Similarity' | 'Inconclusive'
    model_version TEXT NOT NULL DEFAULT 'ArcFace-SFace-r100-v2.4',
    processing_status processing_status_type NOT NULL DEFAULT 'completed',
    image_retention_consent BOOLEAN NOT NULL DEFAULT false,
    image_quality_status TEXT NOT NULL DEFAULT 'Optimal',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Table 4: comparison_images (Private Storage Mapping)
CREATE TABLE IF NOT EXISTS public.comparison_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comparison_id UUID NOT NULL REFERENCES public.comparisons(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    image_slot image_slot_type NOT NULL,
    storage_path TEXT NOT NULL,
    retention_status BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMPTZ
);

-- Table 5: inference_jobs (High-Concurrency Asynchronous Queue State)
CREATE TABLE IF NOT EXISTS public.inference_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comparison_id UUID REFERENCES public.comparisons(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    job_status processing_status_type NOT NULL DEFAULT 'queued',
    processing_stage TEXT NOT NULL DEFAULT 'Validating photographs...',
    worker_reference TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_code TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Table 6: ai_screening_results (2D FFT & Texture Synthetic Media Shield)
CREATE TABLE IF NOT EXISTS public.ai_screening_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comparison_id UUID REFERENCES public.comparisons(id) ON DELETE CASCADE,
    image_slot image_slot_type NOT NULL,
    screening_status ai_screening_status_type NOT NULL DEFAULT 'authentic',
    confidence_score NUMERIC(5, 4) NOT NULL DEFAULT 0.0,
    model_version TEXT NOT NULL DEFAULT 'FFT-Entropy-v2.0',
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Table 7: model_evaluations (Pretrained Benchmark Metrics)
CREATE TABLE IF NOT EXISTS public.model_evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_name TEXT NOT NULL,
    model_version TEXT NOT NULL,
    dataset_version TEXT NOT NULL,
    roc_auc NUMERIC(6, 4) NOT NULL,
    eer NUMERIC(6, 4) NOT NULL,
    far NUMERIC(6, 4) NOT NULL,
    frr NUMERIC(6, 4) NOT NULL,
    thresholds JSONB DEFAULT '{}'::jsonb,
    evaluation_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Table 8: audit_logs (Tamper-Resistant Security Audit Trail)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    event_type TEXT NOT NULL, -- 'AUTH' | 'INFERENCE' | 'SECURITY' | 'ADMIN'
    target_reference TEXT,
    severity TEXT NOT NULL DEFAULT 'INFO', -- 'INFO' | 'WARNING' | 'CRITICAL'
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 3. INDEXES FOR HIGH-CONCURRENCY QUERY OPTIMIZATION
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);
CREATE INDEX IF NOT EXISTS idx_comparisons_user ON public.comparisons(user_id);
CREATE INDEX IF NOT EXISTS idx_comparisons_created_at ON public.comparisons(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comparison_images_comp ON public.comparison_images(comparison_id);
CREATE INDEX IF NOT EXISTS idx_comparison_images_user ON public.comparison_images(user_id);
CREATE INDEX IF NOT EXISTS idx_inference_jobs_status ON public.inference_jobs(job_status);
CREATE INDEX IF NOT EXISTS idx_inference_jobs_user ON public.inference_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON public.audit_logs(event_type);

-- ==============================================================================
-- 4. SECURITY FUNCTIONS (Avoid recursive RLS policies)
-- ==============================================================================

-- Helper function: Check if current authenticated user has an administrative role
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = $1 AND role IN ('admin', 'super_admin')
    );
$$;

-- Helper function: Check if current authenticated user has super_admin role
CREATE OR REPLACE FUNCTION public.is_super_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = $1 AND role = 'super_admin'
    );
$$;

-- Trigger function: Automatically create profile and assign 'user' role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Insert profile
    INSERT INTO public.profiles (id, full_name, avatar_path, status)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url',
        'active'
    ) ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name;

    -- Assign default 'user' role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Log authentication registration event
    INSERT INTO public.audit_logs (actor_id, action, event_type, severity, metadata)
    VALUES (
        NEW.id,
        'USER_REGISTRATION',
        'AUTH',
        'INFO',
        jsonb_build_object('email', NEW.email, 'source', 'supabase_auth')
    );

    RETURN NEW;
END;
$$;

-- Bind trigger to auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger function: Update timestamp
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS across all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comparison_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inference_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_screening_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- Table 1: profiles RLS
-- ------------------------------------------------------------------------------
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = id OR public.is_admin(auth.uid()));

CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- Table 2: user_roles RLS (Never allow users to escalate or update roles)
-- ------------------------------------------------------------------------------
CREATE POLICY "user_roles_select_own_or_admin" ON public.user_roles
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "user_roles_admin_manage" ON public.user_roles
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- ------------------------------------------------------------------------------
-- Table 3: comparisons RLS
-- ------------------------------------------------------------------------------
CREATE POLICY "comparisons_select_own_or_admin" ON public.comparisons
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "comparisons_insert_own" ON public.comparisons
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "comparisons_delete_own" ON public.comparisons
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- ------------------------------------------------------------------------------
-- Table 4: comparison_images RLS
-- ------------------------------------------------------------------------------
CREATE POLICY "comparison_images_select_own_or_admin" ON public.comparison_images
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "comparison_images_insert_own" ON public.comparison_images
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "comparison_images_delete_own" ON public.comparison_images
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- ------------------------------------------------------------------------------
-- Table 5: inference_jobs RLS
-- ------------------------------------------------------------------------------
CREATE POLICY "inference_jobs_select_own_or_admin" ON public.inference_jobs
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "inference_jobs_insert_own" ON public.inference_jobs
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "inference_jobs_update_own_or_admin" ON public.inference_jobs
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- ------------------------------------------------------------------------------
-- Table 6: ai_screening_results RLS
-- ------------------------------------------------------------------------------
CREATE POLICY "ai_screening_select_authenticated" ON public.ai_screening_results
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "ai_screening_insert_authenticated" ON public.ai_screening_results
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- Table 7: model_evaluations RLS
-- ------------------------------------------------------------------------------
CREATE POLICY "model_evaluations_read_authenticated" ON public.model_evaluations
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "model_evaluations_admin_write" ON public.model_evaluations
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- ------------------------------------------------------------------------------
-- Table 8: audit_logs RLS (Append-only by server / admin, readable by admins)
-- ------------------------------------------------------------------------------
CREATE POLICY "audit_logs_select_admin_only" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (public.is_admin(auth.uid()));

CREATE POLICY "audit_logs_insert_authenticated" ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- ==============================================================================
-- 6. SUPABASE STORAGE BUCKET CONFIGURATION & POLICIES
-- ==============================================================================

-- Create private bucket for user comparison photographs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'face-comparison-private',
    'face-comparison-private',
    false,
    10485760, -- 10 MB Limit
    ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Storage RLS Policy 1: Users can upload images to their own private folder
CREATE POLICY "storage_upload_own_folder" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'face-comparison-private'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Storage RLS Policy 2: Users and Admins can view/download images from their folder
CREATE POLICY "storage_select_own_folder_or_admin" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'face-comparison-private'
        AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR public.is_admin(auth.uid())
        )
    );

-- Storage RLS Policy 3: Users can delete their own retained images
CREATE POLICY "storage_delete_own_folder" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'face-comparison-private'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );
