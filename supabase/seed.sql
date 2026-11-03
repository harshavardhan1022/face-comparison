-- ==============================================================================
-- AI Face Similarity Analyzer — Benchmark Baseline Seed Data
-- ==============================================================================

-- Seed Pretrained Model Benchmark Evaluations
INSERT INTO public.model_evaluations (
    model_name,
    model_version,
    dataset_version,
    roc_auc,
    eer,
    far,
    frr,
    thresholds,
    evaluation_date
) VALUES (
    'ArcFace-SFace-ResNet100',
    'v2.4.0',
    'LFW-Cleaned-Benchmark-v1',
    0.9985,
    0.0018,
    0.0010,
    0.0022,
    jsonb_build_object(
        'calibration_tau', 0.38,
        'calibration_steepness', 8.5,
        'threshold_high_similarity', 0.48,
        'threshold_moderate_similarity', 0.38,
        'threshold_low_similarity', 0.20
    ),
    now()
) ON CONFLICT DO NOTHING;

