/**
 * Chart Service for HealthCare Compass
 * Handles chart creation and updates for cost comparisons
 */

class ChartService {
  constructor() {
    this.chartInstance = null;
    this.chartCanvas = document.getElementById('costComparisonChart');
    
    // Initialize event listeners
    this.initEventListeners();
  }

  /**
   * Initialize event listeners
   */
  initEventListeners() {
    // Add event listener for download report button
    const downloadReportBtn = document.getElementById('downloadReportBtn');
    if (downloadReportBtn) {
      downloadReportBtn.addEventListener('click', () => {
        this.createCostReport(window.hospitalService.selectedHospitals);
      });
    }
  }

  /**
   * Initialize chart with default data
   */
  initializeChart() {
    // Default hospitals for initial chart
    if (window.dataService && window.dataService.hospitalsData.length > 0) {
      const defaultHospitals = window.dataService.hospitalsData.slice(0, 3);
      this.updateComparisonChart(defaultHospitals);
    }
  }

  /**
   * Update comparison chart with selected hospitals
   * @param {Array} hospitals - Hospitals to compare
   * @param {string} treatment - Optional treatment to compare costs for
   */
  updateComparisonChart(hospitals, treatment = '') {
    if (!this.chartCanvas) return;
    
    // If no hospitals selected, don't update chart
    if (!hospitals || hospitals.length === 0) {
      if (this.chartInstance) {
        this.chartInstance.data.labels = [];
        this.chartInstance.data.datasets[0].data = [];
        this.chartInstance.update();
      }
      return;
    }
    
    // Sort hospitals by cost (ascending)
    const sortedHospitals = [...hospitals].sort((a, b) => {
      const costA = treatment ? a.cost : (a.averageCost || 0);
      const costB = treatment ? b.cost : (b.averageCost || 0);
      return costA - costB;
    });
    
    // Prepare chart data
    const labels = sortedHospitals.map(h => this.shortenHospitalName(h.NAME));
    
    // Get costs based on treatment or average cost
    let costs;
    let chartTitle;
    
    if (treatment) {
      // If treatment is specified, get costs for that treatment
      costs = sortedHospitals.map(hospital => hospital.cost || 0);
      chartTitle = `${treatment} Cost Comparison`;
    } else {
      // Otherwise use average costs
      costs = sortedHospitals.map(hospital => hospital.averageCost || 0);
      chartTitle = 'Average Cost Comparison';
    }
    
    // Generate a color palette for the pie chart
    const colors = this.generateColorPalette(sortedHospitals.length);
    
    // Create or update chart
    if (this.chartInstance) {
      this.chartInstance.data.labels = labels;
      this.chartInstance.data.datasets[0].data = costs;
      this.chartInstance.data.datasets[0].backgroundColor = colors.background;
      this.chartInstance.data.datasets[0].borderColor = colors.border;
      this.chartInstance.options.plugins.title.text = chartTitle;
      this.chartInstance.update();
    } else {
      const ctx = this.chartCanvas.getContext('2d');
      this.chartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
          labels: labels,
          datasets: [{
            data: costs,
            backgroundColor: colors.background,
            borderColor: colors.border,
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: chartTitle,
              font: {
                size: 16
              }
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const index = context.dataIndex;
                  const hospital = sortedHospitals[index];
                  const cost = costs[index];
                  const treatmentText = treatment ? `Treatment: ${treatment}` : 'Average Cost';
                  return [
                    `Hospital: ${hospital.NAME}`,
                    `${treatmentText}: $${cost.toFixed(2)}`
                  ];
                }
              }
            },
            legend: {
              position: 'right',
              labels: {
                font: {
                  size: 12
                }
              }
            }
          }
        }
      });
    }
    
    // Show the legend for cost categories
    this.showCostLegend();
  }

  /**
   * Generate a color palette for the pie chart
   * @param {number} count - Number of colors needed
   * @returns {Object} Object with background and border colors
   */
  generateColorPalette(count) {
    // Define a set of visually distinct colors
    const baseColors = [
      { bg: 'rgba(52, 168, 83, 0.7)', border: 'rgba(52, 168, 83, 1.0)' }, // Green
      { bg: 'rgba(251, 188, 5, 0.7)', border: 'rgba(251, 188, 5, 1.0)' }, // Yellow
      { bg: 'rgba(234, 67, 53, 0.7)', border: 'rgba(234, 67, 53, 1.0)' }, // Red
      { bg: 'rgba(66, 133, 244, 0.7)', border: 'rgba(66, 133, 244, 1.0)' }, // Blue
      { bg: 'rgba(171, 71, 188, 0.7)', border: 'rgba(171, 71, 188, 1.0)' }, // Purple
      { bg: 'rgba(255, 152, 0, 0.7)', border: 'rgba(255, 152, 0, 1.0)' }, // Orange
      { bg: 'rgba(0, 188, 212, 0.7)', border: 'rgba(0, 188, 212, 1.0)' }, // Cyan
      { bg: 'rgba(233, 30, 99, 0.7)', border: 'rgba(233, 30, 99, 1.0)' }, // Pink
      { bg: 'rgba(76, 175, 80, 0.7)', border: 'rgba(76, 175, 80, 1.0)' }, // Light Green
      { bg: 'rgba(121, 85, 72, 0.7)', border: 'rgba(121, 85, 72, 1.0)' }  // Brown
    ];
    
    // If we need more colors than in our base set, generate additional colors
    const backgroundColors = [];
    const borderColors = [];
    
    for (let i = 0; i < count; i++) {
      if (i < baseColors.length) {
        backgroundColors.push(baseColors[i].bg);
        borderColors.push(baseColors[i].border);
      } else {
        // Generate a random color for additional segments
        const hue = (i * 137.508) % 360; // Golden angle approximation
        backgroundColors.push(`hsla(${hue}, 70%, 60%, 0.7)`);
        borderColors.push(`hsla(${hue}, 70%, 60%, 1.0)`);
      }
    }
    
    return {
      background: backgroundColors,
      border: borderColors
    };
  }

  /**
   * Show cost category legend
   */
  showCostLegend() {
    const legendContainer = document.getElementById('costLegendContainer');
    if (!legendContainer) return;
    
    legendContainer.innerHTML = `
      <div class="cost-legend">
        <div class="legend-item">
          <span class="color-box" style="background-color: rgba(52, 168, 83, 0.7);"></span>
          <span class="legend-label">Lowest Cost</span>
        </div>
        <div class="legend-item">
          <span class="color-box" style="background-color: rgba(251, 188, 5, 0.7);"></span>
          <span class="legend-label">Middle Cost</span>
        </div>
        <div class="legend-item">
          <span class="color-box" style="background-color: rgba(234, 67, 53, 0.7);"></span>
          <span class="legend-label">Highest Cost</span>
        </div>
      </div>
    `;
  }

  /**
   * Get color based on cost category
   * @param {string} category - Cost category ('low', 'medium', or 'high')
   * @param {number} alpha - Alpha transparency (0-1)
   * @returns {string} RGBA color string
   */
  getCostCategoryColor(category, alpha) {
    switch (category) {
      case 'low':
        return `rgba(52, 168, 83, ${alpha})`; // Green
      case 'medium':
        return `rgba(251, 188, 5, ${alpha})`; // Yellow
      case 'high':
        return `rgba(234, 67, 53, ${alpha})`; // Red
      default:
        return `rgba(128, 128, 128, ${alpha})`; // Gray
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
   * Create a downloadable cost report
   * @param {Array} hospitals - Hospitals to include in report
   */
  createCostReport(hospitals) {
    if (!hospitals || hospitals.length === 0) {
      alert('Please select hospitals to compare before generating a report.');
      return;
    }
    
    // Get treatment from hospital service if available
    const treatment = window.hospitalService && window.hospitalService.currentTreatment ? 
      window.hospitalService.currentTreatment : '';
    
    // Create report content
    let reportContent = '# Hospital Cost Comparison Report\n\n';
    reportContent += `Generated on ${new Date().toLocaleDateString()}\n\n`;
    
    // Add hospital information
    reportContent += '## Hospitals Compared\n\n';
    hospitals.forEach((hospital, index) => {
      reportContent += `### ${index + 1}. ${hospital.NAME}\n`;
      reportContent += `- Address: ${hospital.ADDRESS}, ${hospital.CITY}\n`;
      reportContent += `- Total Cases: ${hospital.totalCases || 0}\n`;
      reportContent += `- Average Cost: $${(hospital.averageCost || 0).toFixed(2)}\n\n`;
    });
    
    // Add cost comparison table
    reportContent += '## Cost Comparison\n\n';
    
    if (treatment) {
      // If treatment is specified, create treatment-specific table
      reportContent += `### ${treatment} Treatment Costs\n\n`;
      reportContent += '| Hospital | Cost | Category |\n';
      reportContent += '|----------|------|----------|\n';
      
      // Get comparison data
      const comparisonData = window.dataService.compareHospitalCosts(hospitals, treatment);
      
      comparisonData.forEach(hospital => {
        const costCategory = hospital.costCategory === 'low' ? 'Best (Low)' : 
                            hospital.costCategory === 'medium' ? 'Average' : 'High';
        reportContent += `| ${hospital.NAME} | $${hospital.cost.toFixed(2)} | ${costCategory} |\n`;
      });
    } else {
      // Otherwise create general cost table
      reportContent += '| Hospital | Average Cost | Category |\n';
      reportContent += '|----------|--------------|----------|\n';
      
      // Get comparison data
      const comparisonData = window.dataService.compareHospitalCosts(hospitals);
      
      comparisonData.forEach(hospital => {
        const costCategory = hospital.costCategory === 'low' ? 'Best (Low)' : 
                            hospital.costCategory === 'medium' ? 'Average' : 'High';
        reportContent += `| ${hospital.NAME} | $${(hospital.averageCost || 0).toFixed(2)} | ${costCategory} |\n`;
      });
    }
    
    // Add treatment breakdown if available
    if (treatment) {
      reportContent += '\n## Treatment Details\n\n';
      hospitals.forEach(hospital => {
        reportContent += `### ${hospital.NAME}\n\n`;
        
        if (hospital.treatments) {
          const relevantTreatments = Object.entries(hospital.treatments)
            .filter(([t]) => t.toLowerCase().includes(treatment.toLowerCase()))
            .sort((a, b) => b[1].count - a[1].count);
          
          if (relevantTreatments.length > 0) {
            reportContent += '| Treatment | Cases | Average Cost |\n';
            reportContent += '|-----------|-------|---------------|\n';
            
            relevantTreatments.forEach(([t, stats]) => {
              reportContent += `| ${t} | ${stats.count} | $${stats.averageCost.toFixed(2)} |\n`;
            });
          } else {
            reportContent += `No specific data available for ${treatment} treatments.\n`;
          }
        }
        
        reportContent += '\n';
      });
    }
    
    // In a real application, this would create a downloadable file
    console.log('Cost report generated:', reportContent);
    alert('Cost comparison report generated. In a real application, this would be downloadable.');
  }
}

// Will be initialized in main.js
