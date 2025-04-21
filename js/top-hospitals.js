/**
 * Top Hospitals Page Script
 * Handles loading and displaying top hospitals by utilization
 */

document.addEventListener('DOMContentLoaded', async function() {
    try {
      // Initialize data service
      await dataService.loadHospitalsData();
      
      // Populate specialty filter with actual treatment descriptions
      populateSpecialtyFilter();
      
      // Load top hospitals
      loadTopHospitals();
      
      // Add event listeners for filters
      document.getElementById('specialtyFilter').addEventListener('change', loadTopHospitals);
      document.getElementById('sortBy').addEventListener('change', loadTopHospitals);
    } catch (error) {
      console.error('Error initializing top hospitals page:', error);
      document.getElementById('topHospitalsList').innerHTML = `
        <div class="error-message">
          <i class="fas fa-exclamation-circle"></i>
          <p>Error loading hospital data. Please try again later.</p>
        </div>
      `;
    }
    
    /**
     * Populate specialty filter with actual treatment descriptions from data
     */
    function populateSpecialtyFilter() {
      const specialtyFilter = document.getElementById('specialtyFilter');
      if (!specialtyFilter) return;
      
      // Get unique treatment descriptions (with at least 10 occurrences)
      const treatments = dataService.getUniqueTreatmentDescriptions(10);
      
      // Clear existing options except "All Specialties"
      while (specialtyFilter.options.length > 1) {
        specialtyFilter.remove(1);
      }
      
      // Add treatment descriptions as options
      treatments.forEach(treatment => {
        if (treatment && treatment !== 'Unknown Treatment' && treatment.trim() !== '') {
          const option = document.createElement('option');
          option.value = treatment;
          option.textContent = treatment;
          specialtyFilter.appendChild(option);
        }
      });
    }
    
    /**
     * Load and display top hospitals
     */
    function loadTopHospitals() {
      const specialtyFilter = document.getElementById('specialtyFilter').value;
      const sortBy = document.getElementById('sortBy').value;
      
      // Get top hospitals from data service
      let topHospitals = dataService.getTopHospitals(20);
      
      // Apply specialty filter if not "all"
      if (specialtyFilter !== 'all') {
        topHospitals = topHospitals.filter(hospital => {
          if (!hospital.treatments) return false;
          
          // Check if hospital has the selected treatment
          return Object.keys(hospital.treatments).some(treatment => 
            treatment === specialtyFilter
          );
        });
      }
      
      // Apply sorting
      if (sortBy === 'name') {
        topHospitals.sort((a, b) => a.NAME.localeCompare(b.NAME));
      } else if (sortBy === 'city') {
        topHospitals.sort((a, b) => a.CITY.localeCompare(b.CITY));
      } else if (sortBy === 'cost') {
        topHospitals.sort((a, b) => a.averageCost - b.averageCost);
      } else {
        // Default sort by utilization (totalCases)
        topHospitals.sort((a, b) => b.utilization - a.utilization);
      }
      
      // Render hospitals
      renderTopHospitals(topHospitals);
    }
    
    /**
     * Render top hospitals list
     * @param {Array} hospitals - Hospitals to render
     */
    function renderTopHospitals(hospitals) {
      const container = document.getElementById('topHospitalsList');
      
      if (!container) return;
      
      if (hospitals.length === 0) {
        container.innerHTML = `
          <div class="no-results">
            <i class="fas fa-search"></i>
            <p>No hospitals found matching your criteria.</p>
          </div>
        `;
        return;
      }
      
      let html = '';
      
      hospitals.forEach((hospital, index) => {
        // Calculate the most common treatments
        const topTreatments = Object.entries(hospital.treatments || {})
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 3)
          .map(([name]) => name);
        
        html += `
          <div class="top-hospital-card">
            <div class="top-hospital-rank">${index + 1}</div>
            <div class="top-hospital-info">
              <h3 class="top-hospital-name">${hospital.NAME}</h3>
              <p class="top-hospital-location">
                <i class="fas fa-map-marker-alt"></i> ${hospital.ADDRESS || ''}, ${hospital.CITY}
              </p>
              <div class="top-hospital-stats">
                <div class="stat">
                  <div class="stat-value">${hospital.totalCases.toLocaleString()}</div>
                  <div class="stat-label">Total Patients</div>
                </div>
                <div class="stat">
                  <div class="stat-value">$${Math.round(hospital.averageCost).toLocaleString()}</div>
                  <div class="stat-label">Avg. Cost</div>
                </div>
                <div class="stat">
                  <div class="stat-value">${hospital.rating || '4.0'}</div>
                  <div class="stat-label">Rating</div>
                </div>
              </div>
              ${topTreatments.length > 0 ? `
                <div class="top-treatments">
                  <h4>Top Treatments:</h4>
                  <ul>
                    ${topTreatments.map(treatment => `<li>${treatment}</li>`).join('')}
                  </ul>
                </div>
              ` : ''}
            </div>
            <div class="top-hospital-actions">
              <a href="index.html?hospital=${encodeURIComponent(hospital.NAME)}&city=${encodeURIComponent(hospital.CITY)}" class="btn btn-primary">View Details</a>
            </div>
          </div>
        `;
      });
      
      container.innerHTML = html;
    }
  });