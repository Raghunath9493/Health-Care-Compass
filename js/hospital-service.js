/**
 * Hospital Service for HealthCare Compass
 * Handles hospital-specific functionality and UI rendering
 */

class HospitalService {
  constructor(dataService) {
    this.dataService = dataService;
    this.currentPage = 1;
    this.itemsPerPage = 5;
    this.filteredHospitals = [];
    this.selectedHospitals = [];
    this.userLocation = null;
    this.currentTreatment = ''; // Store current treatment for comparison
    
    // Initialize DOM elements
    this.initDomElements();
    
    // Initialize event listeners
    this.initEventListeners();
  }

  /**
   * Initialize DOM element references
   */
  initDomElements() {
    // Main container elements
    this.hospitalListElement = document.getElementById('hospitalList');
    this.paginationElement = document.getElementById('pagination');
    this.searchResultsTitleElement = document.getElementById('searchResultsTitle');
    this.loadingIndicatorElement = document.getElementById('loadingIndicator');
    if (!this.loadingIndicatorElement) {
      this.loadingIndicatorElement = document.createElement('div');
      this.loadingIndicatorElement.className = 'loading-indicator';
      this.loadingIndicatorElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading hospitals...';
      if (this.hospitalListElement) {
        this.hospitalListElement.parentNode.insertBefore(this.loadingIndicatorElement, this.hospitalListElement);
      }
    }
    
    this.sliderElement = document.getElementById('hospitalSlider');
    
    // Filter elements
    this.budgetFilterElement = document.getElementById('budgetFilter');
    this.cityFilterElement = document.getElementById('cityFilter');
    this.distanceFilterElement = document.getElementById('distanceFilter');
    this.ratingFilterElement = document.getElementById('ratingFilter');
    this.sortByElement = document.getElementById('sortBy');
    
    // Search form elements
    this.searchFormElement = document.getElementById('searchForm');
    this.treatmentInputElement = document.getElementById('treatment');
    this.locationInputElement = document.getElementById('location');
    
    // Comparison chart element
    this.comparisonChartElement = document.getElementById('costComparisonChart');
  }

  /**
   * Initialize event listeners
   */
  initEventListeners() {
    if (this.searchFormElement) {
      this.searchFormElement.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSearch();
      });
    }
    
    // Add event listeners to filter elements
    const filterElements = [
      this.budgetFilterElement,
      this.cityFilterElement,
      this.distanceFilterElement,
      this.ratingFilterElement,
      this.sortByElement
    ];

    filterElements.forEach(element => {
      if (element) {
        element.addEventListener('change', () => {
          this.applyFilters();
        });
      }
    });
  }

  /**
   * Initialize hospital data
   */
  async initialize() {
    this.showLoading(true);
    
    try {
      // Load hospital data
      await this.dataService.loadHospitalsData();
      
      // Try to get user location
      try {
        this.userLocation = await this.dataService.getUserLocation();
      } catch (error) {
        console.warn('Could not get user location:', error);
      }
      
      // Populate city filter dropdown
      this.populateCityFilter();
      
      // Display all hospitals initially
      this.filteredHospitals = [...this.dataService.hospitalsData];
      this.renderHospitals();
      
      // Update search results title
      if (this.searchResultsTitleElement) {
        this.searchResultsTitleElement.textContent = `All Hospitals (${this.filteredHospitals.length} found)`;
      }
      
    } catch (error) {
      console.error('Error initializing hospital data:', error);
      if (this.hospitalListElement) {
        this.hospitalListElement.innerHTML = `
          <div class="error-message">
            <i class="fas fa-exclamation-circle"></i>
            <p>Error loading hospital data. Please try again later.</p>
          </div>
        `;
      }
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * Populate city filter dropdown with unique cities
   */
  populateCityFilter() {
    if (!this.cityFilterElement) return;
    
    // Get unique cities from data service
    const cities = this.dataService.getUniqueCities();
    
    // Clear existing options except the first one
    while (this.cityFilterElement.options.length > 1) {
      this.cityFilterElement.remove(1);
    }
    
    // Add city options
    cities.forEach(city => {
      const option = document.createElement('option');
      option.value = city;
      option.textContent = city;
      this.cityFilterElement.appendChild(option);
    });
  }

  /**
   * Handle search form submission
   */
  async handleSearch() {
    const treatment = this.treatmentInputElement ? this.treatmentInputElement.value.trim() : '';
    const location = this.locationInputElement ? this.locationInputElement.value.trim() : '';
    
    // Store current treatment for comparison
    this.currentTreatment = treatment;
    
    this.showLoading(true);
    
    // Clear current results
    if (this.hospitalListElement) {
      this.hospitalListElement.innerHTML = '';
    }
    
    try {
      // Use the searchByTreatmentAndLocation method from data service
      const hospitals = this.dataService.searchByTreatmentAndLocation(treatment, location);
      
      // Update filtered hospitals
      this.filteredHospitals = hospitals;
      
      // Reset to first page
      this.currentPage = 1;
      
      // Update search results title
      let titleText = 'Hospital Search Results';
      if (treatment) titleText = `${treatment} (${hospitals.length} hospitals found)`;
      if (location && !treatment) titleText = `Hospitals in ${location} (${hospitals.length} found)`;
      if (treatment && location) titleText = `${treatment} in ${location} (${hospitals.length} found)`;
      
      if (this.searchResultsTitleElement) {
        this.searchResultsTitleElement.textContent = titleText;
      }
      
      // Apply filters and render
      this.applyFilters();
      
    } catch (error) {
      console.error('Error during search:', error);
      if (this.hospitalListElement) {
        this.hospitalListElement.innerHTML = `
          <div class="error-message">
            <i class="fas fa-exclamation-circle"></i>
            <p>Error searching hospitals. Please try again later.</p>
          </div>
        `;
      }
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * Apply filters to hospital results
   */
  applyFilters() {
    this.showLoading(true);
    
    // Start with current filtered hospitals or all hospitals if none
    let results = this.filteredHospitals.length ? [...this.filteredHospitals] : [...this.dataService.hospitalsData];
    
    // Apply budget filter
    if (this.budgetFilterElement && this.budgetFilterElement.value !== 'any') {
      results = this.filterByBudget(results, this.budgetFilterElement.value);
    }
    
    // Apply city filter
    if (this.cityFilterElement && this.cityFilterElement.value !== 'all') {
      results = this.dataService.filterByLocation(this.cityFilterElement.value);
    }
    
    // Apply distance filter
    if (this.distanceFilterElement && this.distanceFilterElement.value !== 'any' && this.userLocation) {
      const maxDistance = parseInt(this.distanceFilterElement.value);
      if (!isNaN(maxDistance)) {
        results = this.filterByDistance(results, maxDistance);
      }
    }
    
    // Apply rating filter
    if (this.ratingFilterElement && this.ratingFilterElement.value !== 'any') {
      const minRating = parseInt(this.ratingFilterElement.value);
      if (!isNaN(minRating)) {
        results = results.filter(hospital => parseFloat(hospital.rating) >= minRating);
      }
    }
    
    // Apply sorting
    if (this.sortByElement) {
      results = this.sortHospitals(results, this.sortByElement.value);
    }
    
    // Update filtered hospitals and render
    this.filteredHospitals = results;
    this.currentPage = 1;
    this.renderHospitals();
    
    this.showLoading(false);
  }

  /**
   * Filter hospitals by budget range
   * @param {Array} hospitals - Hospitals to filter
   * @param {string} budgetRange - Budget range string
   * @returns {Array} Filtered hospitals
   */
  filterByBudget(hospitals, budgetRange) {
    return hospitals.filter(hospital => {
      // Use the base encounter cost or average cost if available
      const cost = hospital.BASE_ENCOUNTER_COST || hospital.averageCost || 0;
      
      switch (budgetRange) {
        case '0-1000':
          return cost >= 0 && cost <= 1000;
        case '1000-5000':
          return cost > 1000 && cost <= 5000;
        case '5000-10000':
          return cost > 5000 && cost <= 10000;
        case '10000+':
          return cost > 10000;
        default:
          return true;
      }
    });
  }

  /**
   * Filter hospitals by distance from user location
   * @param {Array} hospitals - Hospitals to filter
   * @param {number} maxDistance - Maximum distance in miles
   * @returns {Array} Filtered hospitals
   */
  filterByDistance(hospitals, maxDistance) {
    if (!this.userLocation) return hospitals;
    
    return hospitals.map(hospital => {
      // Calculate distance if not already calculated
      if (hospital.distance === undefined) {
        // For demo purposes, generate a random distance
        hospital.distance = Math.random() * 50;
      }
      return hospital;
    }).filter(hospital => hospital.distance <= maxDistance);
  }

  /**
   * Sort hospitals by selected criteria
   * @param {Array} hospitals - Hospitals to sort
   * @param {string} sortBy - Sort criteria
   * @returns {Array} Sorted hospitals
   */
  sortHospitals(hospitals, sortBy) {
    switch (sortBy) {
      case 'price-low':
        return [...hospitals].sort((a, b) => (a.averageCost || 0) - (b.averageCost || 0));
      case 'price-high':
        return [...hospitals].sort((a, b) => (b.averageCost || 0) - (a.averageCost || 0));
      case 'rating-high':
        return [...hospitals].sort((a, b) => parseFloat(b.rating || 0) - parseFloat(a.rating || 0));
      case 'cases-high':
        return [...hospitals].sort((a, b) => (b.totalCases || 0) - (a.totalCases || 0));
      case 'distance':
        if (this.userLocation) {
          return [...hospitals].sort((a, b) => (a.distance || 0) - (b.distance || 0));
        }
        return hospitals;
      case 'recommended':
      default:
        // Recommended is a combination of rating, cases, and distance
        return [...hospitals].sort((a, b) => {
          const ratingA = parseFloat(a.rating || 0);
          const ratingB = parseFloat(b.rating || 0);
          const casesA = a.totalCases || 0;
          const casesB = b.totalCases || 0;
          
          // Normalize cases (0-1 scale)
          const maxCases = Math.max(...hospitals.map(h => h.totalCases || 0));
          const normalizedCasesA = maxCases > 0 ? casesA / maxCases : 0;
          const normalizedCasesB = maxCases > 0 ? casesB / maxCases : 0;
          
          // If we have user location, factor in distance
          if (this.userLocation) {
            const distA = a.distance || 50;
            const distB = b.distance || 50;
            
            // Normalize distance (0-1 scale, inverted so closer is better)
            const maxDist = 50; // Assume max distance is 50 miles
            const normalizedDistA = 1 - Math.min(distA / maxDist, 1);
            const normalizedDistB = 1 - Math.min(distB / maxDist, 1);
            
            // Score is weighted combination of rating, cases, and distance
            const scoreA = (ratingA / 5 * 0.4) + (normalizedCasesA * 0.4) + (normalizedDistA * 0.2);
            const scoreB = (ratingB / 5 * 0.4) + (normalizedCasesB * 0.4) + (normalizedDistB * 0.2);
            
            return scoreB - scoreA;
          }
          
          // If no location, just use rating and cases
          const scoreA = (ratingA / 5 * 0.6) + (normalizedCasesA * 0.4);
          const scoreB = (ratingB / 5 * 0.6) + (normalizedCasesB * 0.4);
          return scoreB - scoreA;
        });
    }
  }

  /**
   * Reset all filters to default values
   */
  resetFilters() {
    if (this.budgetFilterElement) this.budgetFilterElement.value = 'any';
    if (this.cityFilterElement) this.cityFilterElement.value = 'all';
    if (this.distanceFilterElement) this.distanceFilterElement.value = 'any';
    if (this.ratingFilterElement) this.ratingFilterElement.value = 'any';
    if (this.sortByElement) this.sortByElement.value = 'recommended';
    
    this.applyFilters();
  }

  /**
   * Render hospitals list with pagination
   */
  renderHospitals() {
    if (!this.hospitalListElement) return;
    
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const hospitalsToShow = this.filteredHospitals.slice(startIndex, endIndex);
    
    if (hospitalsToShow.length === 0) {
      this.hospitalListElement.innerHTML = `
        <div class="no-results">
          <i class="fas fa-search"></i>
          <p>No hospitals found matching your criteria.</p>
          <button class="btn btn-outline" id="resetFiltersBtn">Reset Filters</button>
        </div>
      `;
      
      if (this.sliderElement) {
        this.sliderElement.innerHTML = '';
      }
      
      if (this.paginationElement) {
        this.paginationElement.innerHTML = '';
      }
      
      const resetBtn = document.getElementById('resetFiltersBtn');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          this.resetFilters();
        });
      }
      
      return;
    }
    
    // Generate hospital cards
    const hospitalCards = hospitalsToShow.map(hospital => this.createHospitalCard(hospital)).join('');
    this.hospitalListElement.innerHTML = hospitalCards;
    
    // Clear slider if it exists
    if (this.sliderElement) {
      this.sliderElement.innerHTML = '';
    }
    
    // Add event listeners to hospital cards
    hospitalsToShow.forEach(hospital => {
      const hospitalKey = `${hospital.NAME}-${hospital.CITY}`;
      const compareBtn = document.getElementById(`compare-${hospitalKey}`);
      const detailsBtn = document.getElementById(`details-${hospitalKey}`);
      
      if (compareBtn) {
        compareBtn.addEventListener('click', () => this.toggleCompare(hospital));
      }
      
      if (detailsBtn) {
        detailsBtn.addEventListener('click', () => this.showHospitalDetails(hospital));
      }
    });
    
    // Render pagination
    this.renderPagination();
  }

  /**
   * Create HTML for a hospital card
   * @param {Object} hospital - Hospital data
   * @returns {string} HTML for hospital card
   */
  createHospitalCard(hospital) {
    // Calculate distance if user location is available
    let distanceText = '';
    if (this.userLocation && hospital.distance !== undefined) {
      distanceText = `${hospital.distance.toFixed(1)} miles away • `;
    }
    
    // Determine cost indicator class and value
    const cost = hospital.averageCost || 0;
    let costClass = 'cost-medium';
    if (cost < 100) costClass = 'cost-low';
    if (cost > 150) costClass = 'cost-high';
    
    // Format cost as currency
    const costDisplay = `$${cost.toFixed(2)}`;
    
    // Get treatments for this hospital
    const treatments = hospital.treatments ? Object.keys(hospital.treatments).slice(0, 3) : [];
    
    // Check if hospital is in compare list
    const hospitalKey = `${hospital.NAME}-${hospital.CITY}`;
    const isCompared = this.selectedHospitals.some(h => `${h.NAME}-${h.CITY}` === hospitalKey);
    const compareButtonClass = isCompared ? 'btn-primary' : 'btn-outline';
    const compareButtonText = isCompared ? 'Remove' : 'Compare';
    
    // Create Google Maps URL
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${hospital.ADDRESS}, ${hospital.CITY}`)}`;
    
    return `
      <div class="hospital-card">
        <div class="hospital-content">
          <div class="hospital-header">
            <h4 class="hospital-name">${hospital.NAME}</h4>
          </div>
          
          <div class="hospital-info">
            <a href="${mapsUrl}" target="_blank" class="location-link">
              <i class="fas fa-map-marker-alt"></i> ${distanceText}${hospital.ADDRESS}, ${hospital.CITY}
            </a>
          </div>
          
          <div class="hospital-specialties">
            ${treatments.map(t => `<span class="specialty-tag">${t}</span>`).join('')}
          </div>
          
          <div class="hospital-stats">
            <div class="stat-item">
              <div class="stat-label">Total Cases</div>
              <div class="stat-value">${hospital.totalCases || 0}</div>
            </div>
          </div>
          
          <div class="hospital-footer">
            <div class="estimated-cost">
              <div>Average Cost</div>
              <div class="cost-indicator ${costClass}">${costDisplay}</div>
            </div>
            
            <div class="hospital-actions">
              <button class="btn ${compareButtonClass}" id="compare-${hospitalKey}">${compareButtonText}</button>
              <button class="btn btn-primary" id="details-${hospitalKey}">View Details</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render pagination controls
   */
  renderPagination() {
    if (!this.paginationElement) return;
    
    const totalPages = Math.ceil(this.filteredHospitals.length / this.itemsPerPage);
    
    if (totalPages <= 1) {
      this.paginationElement.innerHTML = '';
      return;
    }
    
    let paginationHTML = '';
    
    // Previous button
    if (this.currentPage > 1) {
      paginationHTML += `<div class="pagination-item" data-page="${this.currentPage - 1}"><i class="fas fa-chevron-left"></i></div>`;
    }
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
      if (i === this.currentPage) {
        paginationHTML += `<div class="pagination-item active">${i}</div>`;
      } else {
        paginationHTML += `<div class="pagination-item" data-page="${i}">${i}</div>`;
      }
    }
    
    // Next button
    if (this.currentPage < totalPages) {
      paginationHTML += `<div class="pagination-item" data-page="${this.currentPage + 1}"><i class="fas fa-chevron-right"></i></div>`;
    }
    
    this.paginationElement.innerHTML = paginationHTML;
    
    // Add event listeners to pagination items
    const paginationItems = this.paginationElement.querySelectorAll('.pagination-item[data-page]');
    paginationItems.forEach(item => {
      item.addEventListener('click', () => {
        this.currentPage = parseInt(item.dataset.page);
        this.renderHospitals();
        
        // Scroll to top of hospital list
        if (this.hospitalListElement) {
          this.hospitalListElement.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }

  /**
   * Toggle hospital in compare list
   * @param {Object} hospital - Hospital to toggle
   */
  toggleCompare(hospital) {
    const hospitalKey = `${hospital.NAME}-${hospital.CITY}`;
    const index = this.selectedHospitals.findIndex(h => `${h.NAME}-${h.CITY}` === hospitalKey);
    
    if (index === -1) {
      // Add to compare list if not already there
      if (this.selectedHospitals.length >= 3) {
        alert('You can compare up to 3 hospitals at a time. Please remove one first.');
        return;
      }
      
      this.selectedHospitals.push(hospital);
    } else {
      // Remove from compare list
      this.selectedHospitals.splice(index, 1);
    }
    
    // Update comparison chart
    this.updateComparisonChart();
    
    // Re-render hospitals to update compare buttons
    this.renderHospitals();
  }

  /**
   * Update comparison chart with selected hospitals
   */
  updateComparisonChart() {
    if (!this.comparisonChartElement || !window.chartService) return;
    
    // If we have a current treatment, use it for comparison
    if (this.currentTreatment && this.selectedHospitals.length > 0) {
      // Get comparison data from data service
      const comparisonData = this.dataService.compareHospitalCosts(this.selectedHospitals, this.currentTreatment);
      
      // Update chart with comparison data
      window.chartService.updateComparisonChart(comparisonData, this.currentTreatment);
    } else {
      // Otherwise just use the selected hospitals with their average costs
      window.chartService.updateComparisonChart(this.selectedHospitals);
    }
  }

  /**
   * Show hospital details
   * @param {Object} hospital - Hospital to show details for
   */
  showHospitalDetails(hospital) {
    // Get the modal element
    const modal = document.getElementById('hospitalDetailsModal');
    if (!modal) {
      // Create modal if it doesn't exist
      this.createHospitalDetailsModal();
    }
    
    // Update modal content
    const modalTitle = document.getElementById('hospitalDetailsTitle');
    const modalBody = document.getElementById('hospitalDetailsBody');
    
    if (modalTitle) modalTitle.textContent = hospital.NAME;
    
    if (modalBody) {
      // Get treatments sorted by count (most common first)
      const treatments = hospital.treatments ? 
        Object.entries(hospital.treatments).sort((a, b) => b[1].count - a[1].count) : 
        [];
      
      // Create treatments HTML
      const treatmentsHtml = treatments.map(([treatment, stats]) => `
        <tr>
          <td>${treatment}</td>
          <td>${stats.count}</td>
          <td>$${stats.averageCost.toFixed(2)}</td>
        </tr>
      `).join('');
      
      modalBody.innerHTML = `
        <div class="hospital-details-info">
          <p><strong>Address:</strong> ${hospital.ADDRESS}, ${hospital.CITY}</p>
          <p><strong>Total Cases:</strong> ${hospital.totalCases || 0}</p>
          <p><strong>Average Cost:</strong> $${(hospital.averageCost || 0).toFixed(2)}</p>
          <p><strong>Rating:</strong> ${hospital.rating || '4.0'} (${hospital.reviews || '100'} reviews)</p>
        </div>
        
        <h5>Treatments</h5>
        <div class="treatments-table-container">
          <table class="treatments-table">
            <thead>
              <tr>
                <th>Treatment</th>
                <th>Cases</th>
                <th>Avg. Cost</th>
              </tr>
            </thead>
            <tbody>
              ${treatmentsHtml}
            </tbody>
          </table>
        </div>
      `;
    }
    
    // Show the modal
    $('#hospitalDetailsModal').modal('show');
  }

  /**
   * Create hospital details modal
   */
  createHospitalDetailsModal() {
    // Create modal element
    const modalHtml = `
      <div class="modal fade" id="hospitalDetailsModal" tabindex="-1" role="dialog" aria-labelledby="hospitalDetailsTitle" aria-hidden="true">
        <div class="modal-dialog modal-lg" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="hospitalDetailsTitle"></h5>
              <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div class="modal-body" id="hospitalDetailsBody">
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Append modal to body
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  /**
   * Show or hide loading indicator
   * @param {boolean} show - Whether to show loading indicator
   */
  showLoading(show) {
    if (this.loadingIndicatorElement) {
      this.loadingIndicatorElement.style.display = show ? 'block' : 'none';
    }
  }
}

// Will be initialized in main.js
