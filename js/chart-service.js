/**
 * Chart Service for HealthCare Compass
 * Handles chart creation and updates for cost comparisons
 */

class ChartService {
  constructor() {
    this.chartInstance = null;
    this.chartCanvas = document.getElementById('costComparisonChart');
    this.procedureSelect = document.getElementById('procedureSelect');
    
    // Initialize event listeners
    this.initEventListeners();
  }

  /**
   * Initialize event listeners
   */
  initEventListeners() {
    // Update chart when procedure selection changes
    if (this.procedureSelect) {
      this.procedureSelect.addEventListener('change', () => {
        this.updateComparisonChart(window.hospitalService.selectedHospitals);
      });
    }
  }

  /**
   * Initialize chart with default data
   */
  initializeChart() {
    // Default hospitals for initial chart
    const defaultHospitals = window.dataService.hospitalsData.slice(0, 3);
    this.updateComparisonChart(defaultHospitals);
  }

  /**
   * Update comparison chart with selected hospitals
   * @param {Array} hospitals - Hospitals to compare
   */
  updateComparisonChart(hospitals) {
    if (!this.chartCanvas) return;
    
    // Get selected procedure
    const procedure = this.procedureSelect ? 
      this.procedureSelect.value : 
      'hip-replacement';
    
    // If no hospitals selected, use first 3 from data
    if (!hospitals || hospitals.length === 0) {
      hospitals = window.dataService.hospitalsData.slice(0, 3);
    }
    
    // Prepare chart data
    const labels = hospitals.map(h => this.shortenHospitalName(h.NAME));
    const costs = hospitals.map(h => h.costs[procedure]);
    
    // Determine colors based on cost
    const backgroundColor = costs.map(cost => this.getCostColor(cost, 0.7));
    const borderColor = costs.map(cost => this.getCostColor(cost, 1.0));
    
    // Get procedure display name
    const procedureDisplayName = this.getProcedureDisplayName(procedure);
    
    // Create or update chart
    if (this.chartInstance) {
      this.chartInstance.data.labels = labels;
      this.chartInstance.data.datasets[0].data = costs;
      this.chartInstance.data.datasets[0].backgroundColor = backgroundColor;
      this.chartInstance.data.datasets[0].borderColor = borderColor;
      this.chartInstance.options.plugins.title.text = `${procedureDisplayName} Cost Comparison`;
      this.chartInstance.update();
    } else {
      const ctx = this.chartCanvas.getContext('2d');
      this.chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Cost ($)',
            data: costs,
            backgroundColor: backgroundColor,
            borderColor: borderColor,
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: `${procedureDisplayName} Cost Comparison`,
              font: {
                size: 16
              }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return `Cost: $${context.raw.toLocaleString()}`;
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Cost in USD'
              },
              ticks: {
                callback: function(value) {
                  return '$' + value.toLocaleString();
                }
              }
            }
          }
        }
      });
    }
  }

  /**
   * Get color based on cost value
   * @param {number} cost - Cost value
   * @param {number} alpha - Alpha transparency (0-1)
   * @returns {string} RGBA color string
   */
  getCostColor(cost, alpha) {
    // Green for low cost, yellow for medium, red for high
    if (cost < 15000) {
      return `rgba(52, 168, 83, ${alpha})`;
    } else if (cost < 20000) {
      return `rgba(251, 188, 5, ${alpha})`;
    } else {
      return `rgba(234, 67, 53, ${alpha})`;
    }
  }

  /**
   * Shorten hospital name for chart display
   * @param {string} name - Full hospital name
   * @returns {string} Shortened name
   */
  shortenHospitalName(name) {
    // Limit to 20 characters
    if (name.length <= 20) return name;
    
    // Try to find a sensible breakpoint
    const breakpoints = [' HOSPITAL', ' MEDICAL', ' CENTER', ' HEALTH'];
    for (const bp of breakpoints) {
      const index = name.indexOf(bp);
      if (index > 0 && index < 20) {
        return name.substring(0, index);
      }
    }
    
    // If no breakpoint found, just truncate
    return name.substring(0, 17) + '...';
  }

  /**
   * Get display name for procedure
   * @param {string} procedureKey - Procedure key
   * @returns {string} Display name
   */
  getProcedureDisplayName(procedureKey) {
    const displayNames = {
      'hip-replacement': 'Hip Replacement',
      'knee-replacement': 'Knee Replacement',
      'cardiac-bypass': 'Cardiac Bypass',
      'mri': 'MRI Scan',
      'physical-therapy': 'Physical Therapy Session'
    };
    
    return displayNames[procedureKey] || procedureKey;
  }

  /**
   * Create a downloadable cost report
   * @param {Array} hospitals - Hospitals to include in report
   */
  createCostReport(hospitals) {
    if (!hospitals || hospitals.length === 0) return;
    
    // Get all procedures
    const procedures = [
      'hip-replacement',
      'knee-replacement',
      'cardiac-bypass',
      'mri',
      'physical-therapy'
    ];
    
    // Create report content
    let reportContent = '# Hospital Cost Comparison Report\n\n';
    reportContent += `Generated on ${new Date().toLocaleDateString()}\n\n`;
    
    // Add table header
    reportContent += '| Procedure | ' + hospitals.map(h => this.shortenHospitalName(h.NAME)).join(' | ') + ' |\n';
    reportContent += '|' + '-'.repeat(10) + '|' + hospitals.map(() => '-'.repeat(15)).join('|') + '|\n';
    
    // Add procedure rows
    for (const proc of procedures) {
      const displayName = this.getProcedureDisplayName(proc);
      reportContent += `| ${displayName} | `;
      
      for (const hospital of hospitals) {
        const cost = hospital.costs[proc];
        reportContent += `$${cost.toLocaleString()} | `;
      }
      
      reportContent += '\n';
    }
    
    // In a real application, this would create a downloadable file
    console.log('Cost report generated:', reportContent);
    alert('Cost comparison report generated. In a real application, this would be downloadable.');
  }
}

// Will be initialized in main.js
