const OpenAI = require('openai');

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const SYSTEM_PROMPT = `You are ChangeGuard AI, an expert change management analyst for IT and software systems.
When given a change request or deployment description, analyze it thoroughly and respond ONLY with a valid JSON object (no markdown, no extra text) with this exact structure:

{
  "title": "Short descriptive title of the change (max 60 chars)",
  "summary": "Clear 2-3 sentence summary of what this change involves",
  "riskLevel": "low|medium|high|critical",
  "riskScore": <number 1-10>,
  "impactAreas": ["area1", "area2", "area3"],
  "potentialRisks": [
    {"risk": "Risk description", "severity": "low|medium|high"},
    ...
  ],
  "recommendations": [
    "Specific actionable recommendation 1",
    "Specific actionable recommendation 2",
    ...
  ],
  "requiredChecks": [
    "Required check or prerequisite 1",
    "Required check or prerequisite 2",
    ...
  ],
  "mitigationStrategies": [
    "Mitigation strategy 1",
    "Mitigation strategy 2",
    ...
  ],
  "approvalConsiderations": "Who should approve this change and why",
  "estimatedDowntime": "Estimated downtime or 'None expected'",
  "rollbackPlan": "Brief rollback strategy",
  "changeCategory": "deployment|configuration|database|security|infrastructure|code|other"
}

Be specific, technical, and practical. Base your analysis on real-world IT change management best practices.`;

const DEMO_RESPONSES = {
  default: {
    title: 'Change Request Analysis',
    summary: 'This change involves modifying a system component that requires careful planning and coordination. The change has been identified as requiring standard review processes and testing protocols.',
    riskLevel: 'medium',
    riskScore: 5,
    impactAreas: ['System Availability', 'User Experience', 'Data Integrity'],
    potentialRisks: [
      { risk: 'Service interruption during deployment window', severity: 'medium' },
      { risk: 'Compatibility issues with existing components', severity: 'medium' },
      { risk: 'Rollback complexity if issues arise', severity: 'low' },
    ],
    recommendations: [
      'Conduct thorough testing in a staging environment before production deployment',
      'Schedule the change during a low-traffic maintenance window',
      'Ensure all team members are notified and available during the change window',
      'Document all configuration changes before and after',
      'Prepare detailed rollback procedures',
    ],
    requiredChecks: [
      'Verify staging environment test results',
      'Confirm backup completion before proceeding',
      'Validate that monitoring and alerting are in place',
      'Review change with affected team leads',
      'Obtain necessary approvals from change board',
    ],
    mitigationStrategies: [
      'Implement feature flags to enable gradual rollout',
      'Set up real-time monitoring dashboards during deployment',
      'Prepare hotfix branch in case immediate patches are needed',
      'Coordinate with on-call support team',
    ],
    approvalConsiderations: 'This change requires approval from the system owner and change advisory board due to potential service impact.',
    estimatedDowntime: '15-30 minutes during maintenance window',
    rollbackPlan: 'Revert to previous version using stored configuration snapshots. Estimated rollback time: 10 minutes.',
    changeCategory: 'deployment',
  },
};

const getDemoResponse = (inputText) => {
  const lower = inputText.toLowerCase();
  const response = { ...DEMO_RESPONSES.default };

  if (lower.includes('database') || lower.includes('migration') || lower.includes('schema')) {
    response.title = 'Database Change Analysis';
    response.summary = 'This database change involves schema modifications or data migrations that directly affect application data integrity and performance. Extreme caution is required.';
    response.riskLevel = 'high';
    response.riskScore = 8;
    response.changeCategory = 'database';
    response.impactAreas = ['Data Integrity', 'Application Performance', 'Business Continuity'];
    response.potentialRisks = [
      { risk: 'Data loss or corruption during migration', severity: 'high' },
      { risk: 'Extended downtime if migration fails midway', severity: 'high' },
      { risk: 'Performance degradation post-migration', severity: 'medium' },
      { risk: 'Application incompatibility with new schema', severity: 'high' },
    ];
    response.estimatedDowntime = '30-60 minutes depending on data volume';
    response.rollbackPlan = 'Restore from pre-migration database backup. Verify data integrity checksums before and after. Estimated rollback: 20-45 minutes.';
  } else if (lower.includes('security') || lower.includes('firewall') || lower.includes('ssl') || lower.includes('certificate')) {
    response.title = 'Security Configuration Change';
    response.summary = 'This security-related change modifies system access controls, encryption settings, or security policies. Requires careful review to avoid creating vulnerabilities or access disruptions.';
    response.riskLevel = 'high';
    response.riskScore = 7;
    response.changeCategory = 'security';
    response.impactAreas = ['Security Posture', 'Access Control', 'Compliance'];
    response.potentialRisks = [
      { risk: 'Unintended access restriction causing service outage', severity: 'high' },
      { risk: 'New security vulnerabilities introduced by misconfiguration', severity: 'high' },
      { risk: 'Compliance violations if security controls are weakened', severity: 'high' },
    ];
  } else if (lower.includes('deploy') || lower.includes('release') || lower.includes('production')) {
    response.title = 'Production Deployment Analysis';
    response.summary = 'A production deployment involves pushing new application code or configurations to the live environment. This change affects all end users and requires thorough validation.';
    response.riskLevel = 'medium';
    response.riskScore = 6;
    response.changeCategory = 'deployment';
  } else if (lower.includes('config') || lower.includes('environment') || lower.includes('setting')) {
    response.title = 'Configuration Change Analysis';
    response.riskLevel = 'low';
    response.riskScore = 3;
    response.changeCategory = 'configuration';
    response.summary = 'A configuration change modifies system settings without altering core application code. While lower risk, configuration errors can still cause significant issues.';
  }

  return response;
};

const analyzeChange = async (inputText) => {
  if (!openai) {
    // Demo mode - return structured but realistic analysis
    console.log('DEMO MODE: OpenAI API key not configured. Using demo analysis.');
    await new Promise((resolve) => setTimeout(resolve, 800)); // Simulate API delay
    return { ...getDemoResponse(inputText), demoMode: true };
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Analyze this change request:\n\n${inputText}` },
      ],
      max_tokens: 1500,
      temperature: 0.3,
    });

    const content = completion.choices[0].message.content.trim();

    // Parse JSON response
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      // Try to extract JSON from response if model added extra text
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('AI returned non-JSON response');
      }
    }

    return { ...parsed, demoMode: false };
  } catch (err) {
    console.error('OpenAI API error:', err.message);
    // Fallback to demo mode on API failure
    return { ...getDemoResponse(inputText), demoMode: true, apiError: true };
  }
};

module.exports = { analyzeChange };
