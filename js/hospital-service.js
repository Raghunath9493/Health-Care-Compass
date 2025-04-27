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
        this.userLocation = await this.requestUserLocation();
        console.log('User location obtained:', this.userLocation);
      } catch (error) {
        console.warn('Could not get user location:', error);
        this.userLocation = { latitude: 40.7128, longitude: -74.0060 }; // Default: New York
        console.log('Using default location:', this.userLocation);
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
    
    const cities = this.dataService.getUniqueCities();
    
    while (this.cityFilterElement.options.length > 1) {
      this.cityFilterElement.remove(1);
    }
    
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
    
    this.currentTreatment = treatment;
    
    this.showLoading(true);
    
    if (this.hospitalListElement) {
      this.hospitalListElement.innerHTML = '';
    }
    
    try {
      const hospitals = this.dataService.searchByTreatmentAndLocation(treatment, location);
      
      this.filteredHospitals = hospitals;
      this.currentPage = 1;
      
      let titleText = 'Hospital Search Results';
      if (treatment) titleText = `${treatment} (${hospitals.length} hospitals found)`;
      if (location && !treatment) titleText = `Hospitals in ${location} (${hospitals.length} found)`;
      if (treatment && location) titleText = `${treatment} in ${location} (${hospitals.length} found)`;
      
      if (this.searchResultsTitleElement) {
        this.searchResultsTitleElement.textContent = titleText;
      }
      
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
    
    let results = this.filteredHospitals.length ? [...this.filteredHospitals] : [...this.dataService.hospitalsData];
    
    if (this.budgetFilterElement && this.budgetFilterElement.value !== 'any') {
      results = this.filterByBudget(results, this.budgetFilterElement.value);
    }
    
    if (this.cityFilterElement && this.cityFilterElement.value !== 'all') {
      results = this.dataService.filterByLocation(this.cityFilterElement.value);
    }
    
    if (this.distanceFilterElement && this.distanceFilterElement.value !== 'any' && this.userLocation) {
      const maxDistance = parseInt(this.distanceFilterElement.value);
      if (!isNaN(maxDistance)) {
        results = this.filterByDistance(results, maxDistance);
      }
    }
    
    if (this.ratingFilterElement && this.ratingFilterElement.value !== 'any') {
      const minRating = parseInt(this.ratingFilterElement.value);
      if (!isNaN(minRating)) {
        results = results.filter(hospital => parseFloat(hospital.rating) >= minRating);
      }
    }
    
    if (this.sortByElement) {
      results = this.sortHospitals(results, this.sortByElement.value);
    }
    
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
    if (!this.userLocation) {
      console.warn('User location not available for distance filtering');
      return hospitals;
    }
    
    return hospitals.map(hospital => {
      if (hospital.distance === undefined) {
        const hospitalCoords = this.getHospitalCoordinates(hospital);
        
        if (hospitalCoords) {
          hospital.distance = this.dataService.calculateDistance(this.userLocation, hospitalCoords);
        } else {
          hospital.distance = null;
        }
      }
      return hospital;
    }).filter(hospital => hospital.distance !== null && hospital.distance <= maxDistance);
  }

  /**
   * Get coordinates for a hospital
   * @param {Object} hospital - Hospital object
   * @returns {Object|null} Coordinates {latitude, longitude} or null if not found
   */
  getHospitalCoordinates(hospital) {
    if (hospital.LATITUDE !== null && hospital.LONGITUDE !== null && !isNaN(hospital.LATITUDE) && !isNaN(hospital.LONGITUDE)) {
      return {
        latitude: hospital.LATITUDE,
        longitude: hospital.LONGITUDE
      };
    }
    console.warn(`No valid coordinates for ${hospital.NAME}, ${hospital.CITY}`);
    return null;
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
        return [...hospitals].sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
      case 'cases-high':
        return [...hospitals].sort((a, b) => (b.totalCases || 0) - (a.totalCases || 0));
      case 'distance':
        if (this.userLocation) {
          return [...hospitals].sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
        }
        return hospitals;
      case 'recommended':
      default:
        return [...hospitals].sort((a, b) => {
          const ratingA = parseFloat(a.rating || 0);
          const ratingB = parseFloat(b.rating || 0);
          const casesA = a.totalCases || 0;
          const casesB = b.totalCases || 0;
          
          const maxCases = Math.max(...hospitals.map(h => h.totalCases || 0));
          const normalizedCasesA = maxCases > 0 ? casesA / maxCases : 0;
          const normalizedCasesB = maxCases > 0 ? casesB / maxCases : 0;
          
          if (this.userLocation) {
            const distA = a.distance || 50;
            const distB = b.distance || 50;
            const maxDist = 50;
            const normalizedDistA = 1 - Math.min(distA / maxDist, 1);
            const normalizedDistB = 1 - Math.min(distB / maxDist, 1);
            
            const scoreA = (ratingA / 5 * 0.4) + (normalizedCasesA * 0.4) + (normalizedDistA * 0.2);
            const scoreB = (ratingB / 5 * 0.4) + (normalizedCasesB * 0.4) + (normalizedDistB * 0.2);
            
            return scoreB - scoreA;
          }
          
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
    
    const hospitalCards = hospitalsToShow.map(hospital => this.createHospitalCard(hospital)).join('');
    this.hospitalListElement.innerHTML = hospitalCards;
    
    if (this.sliderElement) {
      this.sliderElement.innerHTML = '';
    }
    
    hospitalsToShow.forEach(hospital => {
      const hospitalKey = `${hospital.NAME}-${hospital.CITY}`;
      const compareBtn = document.getElementById(`compare-${hospitalKey}`);
      
      if (compareBtn) {
        compareBtn.addEventListener('click', () => this.toggleCompare(hospital));
      }
    });
    
    this.renderPagination();
  }

  /**
   * Create HTML for a hospital card
   * @param {Object} hospital - Hospital data
   * @returns {string} HTML for hospital card
   */
  createHospitalCard(hospital) {
    const hospitalData = {
      name: hospital.NAME || 'Hospital Name Not Available',
      address: hospital.ADDRESS || 'Address Not Available',
      city: hospital.CITY || 'City Not Available',
      averageCost: hospital.averageCost || 0,
      treatments: hospital.treatments ? Object.keys(hospital.treatments).slice(0, 3) : [],
      distance: hospital.distance !== undefined ? hospital.distance : null
    };
    
    let distanceText = '';
    let distanceClass = '';
    if (this.userLocation && hospitalData.distance !== null && !isNaN(hospitalData.distance)) {
      const distance = hospitalData.distance.toFixed(1);
      distanceText = `<span class="distance-badge">${distance} miles away</span>`;
      
      if (distance <= 5) {
        distanceClass = 'distance-very-close';
      } else if (distance <= 15) {
        distanceClass = 'distance-close';
      } else if (distance <= 30) {
        distanceClass = 'distance-medium';
      } else {
        distanceClass = 'distance-far';
      }
    } else {
      distanceText = `<span class="distance-badge">Distance unavailable</span>`;
      distanceClass = 'distance-unavailable';
    }
    
    const cost = hospitalData.averageCost;
    let costClass = 'cost-medium';
    if (cost < 100) costClass = 'cost-low';
    if (cost > 150) costClass = 'cost-high';
    
    const costDisplay = `$${cost.toFixed(2)}`;
    
    const hospitalKey = `${hospital.NAME}-${hospital.CITY}`;
    const isCompared = this.selectedHospitals.some(h => `${h.NAME}-${h.CITY}` === hospitalKey);
    const compareButtonClass = isCompared ? 'btn-primary' : 'btn-outline';
    const compareButtonText = isCompared ? 'Remove' : 'Compare';
    
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${hospitalData.address}, ${hospitalData.city}`)}`;
    
    return `
      <div class="hospital-card ${distanceClass}">
        <!-- Left column - Hospital name -->
        <div class="hospital-name-column">
          <h3 class="hospital-name">${hospitalData.name}</h3>
          ${distanceText}
        </div>
        
        <!-- Center column - Hospital details -->
        <div class="hospital-details-column">
          <div class="hospital-info">
            <p class="hospital-address">
              <i class="fas fa-map-marker-alt"></i> ${hospitalData.address}, ${hospitalData.city}
            </p>
            <p class="hospital-cost ${costClass}">
              <i class="fas fa-dollar-sign"></i> Average Cost: ${costDisplay}
            </p>
            ${hospitalData.treatments.length > 0 ? `
              <div class="hospital-treatments">
                <p><strong>Common Treatments:</strong></p>
                <ul>
                  ${hospitalData.treatments.map(t => `<li>${t}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
          </div>
        </div>
        
        <!-- Right column - Hospital actions -->
        <div class="hospital-actions-column">
          <div class="hospital-actions">
            <a href="${mapsUrl}" target="_blank" class="btn btn-outline">
              <i class="fas fa-directions"></i> Get Directions
            </a>
            <button class="btn ${compareButtonClass} compare-btn" id="compare-${hospitalKey}">
              <i class="fas fa-balance-scale"></i> ${compareButtonText}
            </button>
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
    const currentPage = this.currentPage;
    const maxVisiblePages = 5;
    
    if (totalPages <= 1) {
      this.paginationElement.innerHTML = '';
      return;
    }
    
    let paginationHTML = '';
    
    if (currentPage > 1) {
      paginationHTML += `<div class="pagination-item" data-page="${currentPage - 1}"><i class="fas fa-chevron-left"></i></div>`;
    }
    
    let startPage, endPage;
    if (totalPages <= maxVisiblePages) {
      startPage = 1;
      endPage = totalPages;
    } else {
      const halfMax = Math.floor(maxVisiblePages / 2);
      if (currentPage <= halfMax) {
        startPage = 1;
        endPage = maxVisiblePages;
      } else if (currentPage + halfMax >= totalPages) {
        startPage = totalPages - maxVisiblePages + 1;
        endPage = totalPages;
      } else {
        startPage = currentPage - halfMax;
        endPage = currentPage + halfMax;
      }
    }
    
    for (let i = startPage; i <= endPage; i++) {
      if (i === currentPage) {
        paginationHTML += `<div class="pagination-item active">${i}</div>`;
      } else {
        paginationHTML += `<div class="pagination-item" data-page="${i}">${i}</div>`;
      }
    }
    
    if (currentPage < totalPages) {
      paginationHTML += `<div class="pagination-item" data-page="${currentPage + 1}"><i class="fas fa-chevron-right"></i></div>`;
    }
    
    this.paginationElement.innerHTML = paginationHTML;
    
    const paginationItems = this.paginationElement.querySelectorAll('.pagination-item[data-page]');
    paginationItems.forEach(item => {
      item.addEventListener('click', () => {
        this.currentPage = parseInt(item.dataset.page);
        this.renderHospitals();
        
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
      if (this.selectedHospitals.length >= 10) {
        alert('You can compare up to 10 hospitals at a time. Please remove one first.');
        return;
      }
      
      this.selectedHospitals.push(hospital);
    } else {
      this.selectedHospitals.splice(index, 1);
    }
    
    const costComparisonCard = document.getElementById('cost-comparison-card');
    if (costComparisonCard && this.selectedHospitals.length > 0) {
      costComparisonCard.style.display = 'block';
    } else if (costComparisonCard && this.selectedHospitals.length === 0) {
      costComparisonCard.style.display = 'none';
    }
    
    this.updateComparisonChart();
    this.renderHospitals();
  }

  /**
   * Update comparison chart with selected hospitals
   */
  updateComparisonChart() {
    if (!this.comparisonChartElement || !window.chartService) return;
    
    if (this.currentTreatment && this.selectedHospitals.length > 0) {
      const comparisonData = this.dataService.compareHospitalCosts(this.selectedHospitals, this.currentTreatment);
      window.chartService.updateComparisonChart(comparisonData, this.currentTreatment);
    } else {
      window.chartService.updateComparisonChart(this.selectedHospitals);
    }
  }

  /**
   * Show hospital details
   * @param {Object} hospital - Hospital to show details for
   */
  showHospitalDetails(hospital) {
    const modal = document.getElementById('hospitalDetailsModal');
    if (!modal) {
      this.createHospitalDetailsModal();
    }
    
    const modalTitle = document.getElementById('hospitalDetailsTitle');
    const modalBody = document.getElementById('hospitalDetailsBody');
    
    if (modalTitle) modalTitle.textContent = hospital.NAME;
    
    if (modalBody) {
      const treatments = hospital.treatments ? 
        Object.entries(hospital.treatments).sort((a, b) => b[1].count - a[1].count) : 
        [];
      
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
    
    $('#hospitalDetailsModal').modal('show');
  }

  /**
   * Create hospital details modal
   */
  createHospitalDetailsModal() {
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

  /**
   * Get top hospitals by utilization
   * @param {number} limit - Maximum number of hospitals to return
   * @returns {Array} Top hospitals sorted by utilization
   */
  getTopHospitalsByUtilization(limit = 10) {
    const sortedHospitals = this.dataService.hospitalsData.slice().sort((a, b) => {
      return (b.utilization || 0) - (a.utilization || 0);
    });
    
    return sortedHospitals.slice(0, limit);
  }

  /**
   * Request user location with a clear message
   * @returns {Promise} Promise that resolves with user location coordinates
   */
  requestUserLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }
      
      const locationMessage = document.createElement('div');
      locationMessage.className = 'location-message';
      locationMessage.innerHTML = `
        <div class="location-message-content">
          <p>HealthCare Compass would like to use your location to find hospitals near you.</p>
          <p>This helps us show you the closest hospitals and calculate distances.</p>
          <p>You can allow or deny this request.</p>
        </div>
      `;
      document.body.appendChild(locationMessage);
      
      setTimeout(() => {
        if (document.body.contains(locationMessage)) {
          document.body.removeChild(locationMessage);
        }
      }, 5000);
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (document.body.contains(locationMessage)) {
            document.body.removeChild(locationMessage);
          }
          
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          if (document.body.contains(locationMessage)) {
            document.body.removeChild(locationMessage);
          }
          
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }
}