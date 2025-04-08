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
    
    // Prepare chart data
    const labels = hospitals.map(h => this.shortenHospitalName(h.NAME));
    
    // Get costs based on treatment or average cost
    let costs;
    let chartTitle;
    
    if (treatment) {
      // If treatment is specified, get costs for that treatment
      costs = hospitals.map(hospital => {
        // Find treatment cost using data service
        return window.dataService.getTreatmentCost(hospital, treatment);
      });
      chartTitle = `${treatment} Cost Comparison`;
    } else {
      // Otherwise use average costs
      costs = hospitals.map(hospital => hospital.averageCost || 0);
      chartTitle = 'Average Cost Comparison';
    }
    
    // Get cost categories for color coding
    const costCategories = window.dataService.compareHospitalCosts(hospitals, treatment);
    
    // Map cost categories to colors
    const backgroundColor = costCategories.map(hospital => this.getCostCategoryColor(hospital.costCategory, 0.7));
    const borderColor = costCategories.map(hospital => this.getCostCategoryColor(hospital.costCategory, 1.0));
    
    // Create or update chart
    if (this.chartInstance) {
      this.chartInstance.data.labels = labels;
      this.chartInstance.data.datasets[0].data = costs;
      this.chartInstance.data.datasets[0].backgroundColor = backgroundColor;
      this.chartInstance.data.datasets[0].borderColor = borderColor;
      this.chartInstance.options.plugins.title.text = chartTitle;
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
              text: chartTitle,
              font: {
                size: 16
              }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return `Cost: $${context.raw.toFixed(2)}`;
                }
              }
            },
            legend: {
              display: false
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
                  return '$' + value.toFixed(2);
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
   * Show cost category legend
   */
  showCostLegend() {
    const legendContainer = document.getElementById('costLegendContainer');
    if (!legendContainer) return;
    
    legendContainer.innerHTML = `
      <div class="cost-legend">
        <div class="legend-item">
          <span class="color-box" style="background-color: rgba(52, 168, 83, 0.7);"></span>
          <span class="legend-label">Best (Low Cost)</span>
        </div>
        <div class="legend-item">
          <span class="color-box" style="background-color: rgba(251, 188, 5, 0.7);"></span>
          <span class="legend-label">Average Cost</span>
        </div>
        <div class="legend-item">
          <span class="color-box" style="background-color: rgba(234, 67, 53, 0.7);"></span>
          <span class="legend-label">High Cost</span>
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
