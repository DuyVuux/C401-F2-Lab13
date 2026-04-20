# Alert Rules and Runbooks

This document outlines the alert rules and corresponding runbooks for the Day 13 Observability Lab healthcare chatbot system.

## Table of Contents
1. [High Latency P95](#1-high-latency-p95)
2. [High Error Rate](#2-high-error-rate)
3. [Cost Budget Spike](#3-cost-budget-spike)
4. [Low Quality Score](#4-low-quality-score)
5. [Service Down](#5-service-down)

## Contact Information
- **On-call Engineer**: team-oncall@company.com
- **Slack Channel**: #observability-alerts
- **PagerDuty**: observability-team
- **Documentation**: [Internal Wiki](https://wiki.company.com/observability)

---

## 1. High Latency P95

### Description
- **Severity**: P2 (High Impact, Requires Attention)
- **Trigger Condition**: `latency_p95_ms > 5000 for 30m`
- **Impact**: P95 response latency exceeds 5 seconds for 30 minutes, breaching SLO and degrading user experience
- **Expected Resolution Time**: Within 1 hour
- **Business Impact**: Users experience slow responses, potential abandonment of healthcare queries

### Investigation Steps
1. **Access Langfuse UI**: Navigate to traces dashboard, filter by last 1 hour
2. **Identify Slow Traces**: Sort by duration, examine top 10 slowest requests
3. **Span Analysis**: Compare RAG retrieval vs LLM generation span durations
4. **Incident Check**: Verify if `rag_slow` incident toggle is enabled via `/health` endpoint
5. **Resource Monitoring**: Check system metrics (CPU >80%, Memory >85%, Network saturation)
6. **Log Correlation**: Search logs by `correlation_id` for affected requests
7. **User Impact Assessment**: Query metrics for error rate correlation

### Mitigation Actions
#### Immediate (0-15 minutes)
- Enable query truncation for inputs >500 characters
- Scale up LLM instances if resource constrained

#### Short-term (15-60 minutes)
- Switch to fallback retrieval source (cached responses)
- Reduce prompt complexity (shorter system prompts)
- Implement request queuing for non-critical features

#### Long-term (1+ hours)
- Optimize vector database queries
- Implement response caching for common queries
- Review and optimize LLM model selection

### Escalation Protocol
- **15 minutes**: Notify engineering team lead
- **45 minutes**: Escalate to P1 if no improvement
- **60 minutes**: Customer communication if user impact >10%

### Prevention Measures
- Regular performance testing with load simulation
- Monitor P95 latency trends weekly
- Implement gradual rollout for LLM changes

---

## 2. High Error Rate

### Description
- **Severity**: P1 (Critical, Immediate Action Required)
- **Trigger Condition**: `error_rate_pct > 5 for 5m`
- **Impact**: More than 5% of requests failing in 5-minute window, users receiving error responses
- **Expected Resolution Time**: Within 30 minutes
- **Business Impact**: Healthcare users unable to access critical information

### Investigation Steps
1. **Error Grouping**: Group logs by `error_type` field in structured logs
2. **Trace Inspection**: Review failed traces in Langfuse for error patterns
3. **Root Cause Analysis**:
   - LLM API failures (rate limits, model errors)
   - Tool execution errors (PII scrubbing, RAG failures)
   - Schema validation errors (malformed requests)
4. **Deployment Check**: Verify recent deployments via git log
5. **Dependency Health**: Check external service status (if applicable)
6. **Load Analysis**: Correlate with request volume spikes

### Mitigation Actions
#### Immediate (0-10 minutes)
- Rollback latest deployment if error spike correlates
- Enable circuit breaker for failing components
- Switch to degraded mode (cached responses only)

#### Short-term (10-30 minutes)
- Disable problematic tools/features
- Implement exponential backoff for retries
- Route traffic to backup model endpoints

#### Long-term (30+ minutes)
- Fix root cause (code, configuration, or infrastructure)
- Add comprehensive error handling
- Implement chaos engineering testing

### Escalation Protocol
- **Immediate**: Alert on-call engineer via PagerDuty
- **10 minutes**: Notify full engineering team
- **20 minutes**: Escalate to incident response team
- **30 minutes**: Executive notification if outage persists

### Prevention Measures
- Comprehensive error handling in all code paths
- Automated testing for error scenarios
- Gradual deployment with feature flags
- Regular chaos engineering exercises

---

## 3. Cost Budget Spike

### Description
- **Severity**: P2 (Financial Impact, Monitor Closely)
- **Trigger Condition**: `hourly_cost_usd > 2x_baseline for 15m`
- **Impact**: Hourly costs exceeding 2x baseline, potential budget overrun
- **Expected Resolution Time**: Within 2 hours
- **Business Impact**: Increased operational costs, potential budget constraints

### Investigation Steps
1. **Cost Analysis**: Split traces by `feature` and `model` tags in Langfuse
2. **Token Efficiency**: Compare `tokens_in`/`tokens_out` ratios across requests
3. **Incident Verification**: Check if `cost_spike` incident simulation is active
4. **Usage Patterns**: Analyze request complexity and frequency by feature
5. **Model Distribution**: Review which models are consuming most costs
6. **Baseline Comparison**: Verify baseline calculation accuracy

### Mitigation Actions
#### Immediate (0-30 minutes)
- Implement prompt shortening (truncate to 1000 tokens max)
- Enable prompt caching for repeated queries
- Route simple queries to cheaper models

#### Short-term (30-120 minutes)
- Apply rate limiting based on cost thresholds
- Optimize prompt engineering for efficiency
- Implement cost-aware model selection

#### Long-term (2+ hours)
- Review pricing tiers and model selection strategy
- Implement usage quotas per user/feature
- Develop cost optimization pipelines

### Escalation Protocol
- **30 minutes**: Notify finance/operations team
- **60 minutes**: Escalate to P1 if costs continue rising
- **90 minutes**: Executive review for budget implications

### Prevention Measures
- Cost monitoring dashboards with alerts
- Regular cost optimization reviews
- Usage analytics and forecasting
- Automated cost controls and limits

---

## 4. Low Quality Score

### Description
- **Severity**: P3 (Low Impact, Monitor and Address)
- **Trigger Condition**: `quality_score_avg < 0.5 for 1h`
- **Impact**: Average response quality below acceptable threshold for 1 hour
- **Expected Resolution Time**: Within 4 hours
- **Business Impact**: Users receiving suboptimal healthcare information

### Investigation Steps
1. **Quality Metrics Review**: Analyze quality_score distribution across features
2. **Response Sampling**: Manually review recent responses for accuracy
3. **Model Performance**: Check LLM model performance by feature type
4. **Prompt Analysis**: Review prompt templates for degradation
5. **Data Quality**: Verify knowledge base freshness and accuracy

### Mitigation Actions
#### Immediate (0-1 hour)
- Enable fallback to high-quality cached responses
- Reduce response complexity for affected features

#### Short-term (1-4 hours)
- Update prompt engineering for better accuracy
- Refresh knowledge base with recent medical data
- Implement response validation checks

#### Long-term (4+ hours)
- Retrain models with improved datasets
- Implement continuous quality monitoring
- Develop automated quality assurance pipelines

### Escalation Protocol
- **2 hours**: Notify product team for quality review
- **4 hours**: Escalate to engineering if quality doesn't improve

### Prevention Measures
- Regular quality audits and A/B testing
- Automated quality scoring in CI/CD pipeline
- Continuous model performance monitoring
- User feedback integration for quality improvement

---

## 5. Service Down

### Description
- **Severity**: P0 (Critical Outage, All Hands on Deck)
- **Trigger Condition**: `uptime_pct < 99.9 for 5m`
- **Impact**: Service availability below 99.9% for 5 minutes, complete or partial outage
- **Expected Resolution Time**: Within 15 minutes
- **Business Impact**: Healthcare users completely unable to access chatbot services

### Investigation Steps
1. **Health Check**: Query `/health` endpoint for service status
2. **Infrastructure Check**: Verify server/container status and resource utilization
3. **Dependency Status**: Check database, LLM API, and external services
4. **Recent Changes**: Review deployment history and configuration changes
5. **Log Analysis**: Search for critical errors in application logs
6. **Network Issues**: Check for connectivity problems or DDoS indicators

### Mitigation Actions
#### Immediate (0-5 minutes)
- Restart failed service instances
- Enable emergency maintenance page
- Switch to backup infrastructure if available

#### Short-term (5-15 minutes)
- Rollback to previous stable deployment
- Scale up resources or enable auto-scaling
- Implement traffic diversion to healthy instances

#### Long-term (15+ minutes)
- Root cause analysis and fix
- Update monitoring and alerting thresholds
- Implement redundancy and failover mechanisms

### Escalation Protocol
- **Immediate**: Alert entire engineering team and management
- **5 minutes**: Notify customer success and communications team
- **10 minutes**: Executive briefing if outage persists

### Prevention Measures
- Multi-region deployment with automatic failover
- Comprehensive health checks and auto-healing
- Regular disaster recovery testing
- Capacity planning and load testing

---

## Post-Incident Review Process
For all alerts, conduct a post-mortem within 24 hours including:
- Timeline of events
- Root cause analysis
- Impact assessment
- Lessons learned
- Action items for prevention

## Related Documentation
- [SLO Definitions](../config/slo.yaml)
- [Alert Rules Configuration](../config/alert_rules.yaml)
- [Dashboard Specifications](dashboard-spec.md)
