-- Function to calculate subscription probability for detected sites
-- Based on visit frequency, billing page visits, and confidence level

CREATE OR REPLACE FUNCTION calculate_subscription_probability(
    p_visit_count_30d INTEGER,
    p_visited_billing_page BOOLEAN,
    p_confidence_level TEXT
) RETURNS INTEGER AS $$
DECLARE
    score INTEGER := 0;
BEGIN
    -- Visit frequency scoring (40 points max)
    IF p_visit_count_30d > 30 THEN
        score := score + 40;
    ELSIF p_visit_count_30d > 20 THEN
        score := score + 30;
    ELSIF p_visit_count_30d > 10 THEN
        score := score + 20;
    ELSIF p_visit_count_30d > 5 THEN
        score := score + 10;
    END IF;
    
    -- Billing page visited (30 points)
    IF p_visited_billing_page THEN
        score := score + 30;
    END IF;
    
    -- Confidence level (30 points max)
    IF p_confidence_level = 'confirmed' THEN
        score := score + 30;
    ELSIF p_confidence_level = 'likely' THEN
        score := score + 20;
    ELSIF p_confidence_level = 'visited' THEN
        score := score + 5;
    END IF;
    
    -- Cap at 100
    IF score > 100 THEN
        score := 100;
    END IF;
    
    RETURN score;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate usage intensity
CREATE OR REPLACE FUNCTION calculate_usage_intensity(
    p_visit_count_30d INTEGER
) RETURNS TEXT AS $$
BEGIN
    IF p_visit_count_30d > 20 THEN
        RETURN 'high';
    ELSIF p_visit_count_30d > 8 THEN
        RETURN 'medium';
    ELSE
        RETURN 'low';
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
