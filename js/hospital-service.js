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
    
    // DOM elements
    this.hospitalListElement = document.getElementById('hospitalList');
    this.paginationElement = document.getElementById('pagination');
    this.searchResultsTitleElement = document.getElementById('searchResultsTitle');
    this.loadingIndicatorElement = document.getElementById('loadingIndicator');
    
    // Filter elements
    this.budgetFilterElement = document.getElementById('budgetFilter');
    this.specialtyFilterElement = document.getElementById('specialtyFilter');
    this.distanceFilterElement = document.getElementById('distanceFilter');
    this.ratingFilterElement = document.getElementById('ratingFilter');
    this.sortByElement = document.getElementById('sortBy');
    
    // Search form elements
    this.searchFormElement = document.getElementById('searchForm');
    this.treatmentInputElement = document.getElementById('treatment');
    this.locationInputElement = document.getElementById('location');
    
    // // Map view button
    // this.mapViewBtnElement = document.getElementById('mapViewBtn');
    
    this.initEventListeners();
  }

  /**
   * Initialize event listeners
   */
  initEventListeners() {
    // Search form submission
    this.searchFormElement.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSearch();
    });
    
    // Filter change events
    this.budgetFilterElement.addEventListener('change', () => this.applyFilters());
    this.specialtyFilterElement.addEventListener('change', () => this.applyFilters());
    this.distanceFilterElement.addEventListener('change', () => this.applyFilters());
    this.ratingFilterElement.addEventListener('change', () => this.applyFilters());
    this.sortByElement.addEventListener('change', () => this.applyFilters());
    
    // // Map view button
    // this.mapViewBtnElement.addEventListener('click', () => this.toggleMapView());
  }

  /**
   * Initialize hospital data
   */
  async initialize() {
    this.showLoading(true);
    
    try {
      // Load hospital data
      await this.dataService.loadHospitalsData();
      
      // Generate mock data for ratings and costs
      this.dataService.generateMockRatings();
      this.dataService.generateMockCostData();
      
      // Try to get user location
      try {
        this.userLocation = await this.dataService.getUserLocation();
      } catch (error) {
        console.warn('Could not get user location:', error);
      }
      
      // Display all hospitals initially
      this.filteredHospitals = [...this.dataService.hospitalsData];
      this.renderHospitals();
      
    } catch (error) {
      console.error('Error initializing hospital data:', error);
      this.hospitalListElement.innerHTML = `
        <div class="error-message">
          <i class="fas fa-exclamation-circle"></i>
          <p>Error loading hospital data. Please try again later.</p>
        </div>
      `;
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * Handle search form submission
   */
  handleSearch() {
    this.showLoading(true);
    
    const treatment = this.treatmentInputElement.value.trim();
    const location = this.locationInputElement.value.trim();
    
    // Reset filters and pagination
    this.resetFilters();
    this.currentPage = 1;
    
    // Filter hospitals by location if provided
    let results = location ? 
      this.dataService.filterByLocation(location) : 
      [...this.dataService.hospitalsData];
    
    // Update search results title
    let titleText = 'Hospital Search Results';
    if (treatment) titleText = `${treatment} (${results.length} hospitals found)`;
    if (location && !treatment) titleText = `Hospitals in ${location} (${results.length} found)`;
    if (treatment && location) titleText = `${treatment} in ${location} (${results.length} found)`;
    
    this.searchResultsTitleElement.textContent = titleText;
    
    // Update filtered hospitals and render
    this.filteredHospitals = results;
    this.renderHospitals();
    
    this.showLoading(false);
  }

  /**
   * Apply filters to hospital results
   */
  applyFilters() {
    this.showLoading(true);
    
    // Start with all hospitals or current search results
    let results = [...this.filteredHospitals];
    
    // Apply budget filter
    const budgetFilter = this.budgetFilterElement.value;
    if (budgetFilter !== 'any') {
      results = this.filterByBudget(results, budgetFilter);
    }
    
    // Apply specialty filter
    const specialtyFilter = this.specialtyFilterElement.value;
    if (specialtyFilter !== 'all') {
      results = this.filterBySpecialty(results, specialtyFilter);
    }
    
    // Apply distance filter
    const distanceFilter = parseInt(this.distanceFilterElement.value);
    if (distanceFilter && this.userLocation) {
      results = this.dataService.filterByDistance(
        results, 
        this.userLocation, 
        distanceFilter
      );
    }
    
    // Apply rating filter
    const ratingFilter = parseInt(this.ratingFilterElement.value);
    if (ratingFilter) {
      results = results.filter(hospital => parseFloat(hospital.rating) >= ratingFilter);
    }
    
    // Apply sorting
    const sortBy = this.sortByElement.value;
    results = this.sortHospitals(results, sortBy);
    
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
    // For demonstration, we'll use the hip replacement cost
    const procedure = 'hip-replacement';
    
    switch (budgetRange) {
      case '0-1000':
        return hospitals.filter(h => h.costs[procedure] < 1000);
      case '1000-5000':
        return hospitals.filter(h => h.costs[procedure] >= 1000 && h.costs[procedure] < 5000);
      case '5000-10000':
        return hospitals.filter(h => h.costs[procedure] >= 5000 && h.costs[procedure] < 10000);
      case '10000+':
        return hospitals.filter(h => h.costs[procedure] >= 10000);
      default:
        return hospitals;
    }
  }

  /**
   * Filter hospitals by specialty
   * @param {Array} hospitals - Hospitals to filter
   * @param {string} specialty - Specialty to filter by
   * @returns {Array} Filtered hospitals
   */
  filterBySpecialty(hospitals, specialty) {
    // In a real application, this would filter based on actual specialty data
    // For demonstration, we'll use a random selection based on hospital ID
    return hospitals.filter(hospital => {
      const id = hospital.Id;
      const specialties = {
        'cardiology': ['1', '5', '9'],
        'orthopedics': ['2', '6', '0'],
        'neurology': ['3', '7'],
        'oncology': ['4', '8'],
        'general': ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
      };
      
      return specialties[specialty].some(digit => id.includes(digit));
    });
  }

  /**
   * Sort hospitals by selected criteria
   * @param {Array} hospitals - Hospitals to sort
   * @param {string} sortBy - Sort criteria
   * @returns {Array} Sorted hospitals
   */
  sortHospitals(hospitals, sortBy) {
    const procedure = 'hip-replacement';
    
    switch (sortBy) {
      case 'price-low':
        return [...hospitals].sort((a, b) => a.costs[procedure] - b.costs[procedure]);
      case 'price-high':
        return [...hospitals].sort((a, b) => b.costs[procedure] - a.costs[procedure]);
      case 'rating-high':
        return [...hospitals].sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
      case 'distance':
        if (this.userLocation) {
          return [...hospitals].sort((a, b) => {
            const distA = this.dataService.calculateDistance(
              this.userLocation.lat, this.userLocation.lon, a.LAT, a.LON
            );
            const distB = this.dataService.calculateDistance(
              this.userLocation.lat, this.userLocation.lon, b.LAT, b.LON
            );
            return distA - distB;
          });
        }
        return hospitals;
      case 'recommended':
      default:
        // Recommended is a combination of rating and distance
        return [...hospitals].sort((a, b) => {
          const ratingA = parseFloat(a.rating) || 0;
          const ratingB = parseFloat(b.rating) || 0;
          
          // If we have user location, factor in distance
          if (this.userLocation) {
            const distA = this.dataService.calculateDistance(
              this.userLocation.lat, this.userLocation.lon, a.LAT, a.LON
            );
            const distB = this.dataService.calculateDistance(
              this.userLocation.lat, this.userLocation.lon, b.LAT, b.LON
            );
            
            // Score is rating minus normalized distance penalty
            const scoreA = ratingA - (distA / 100);
            const scoreB = ratingB - (distB / 100);
            
            return scoreB - scoreA;
          }
          
          // If no location, just use rating
          return ratingB - ratingA;
        });
    }
  }

  /**
   * Reset all filters to default values
   */
  resetFilters() {
    this.budgetFilterElement.value = 'any';
    this.specialtyFilterElement.value = 'all';
    this.distanceFilterElement.value = 'any';
    this.ratingFilterElement.value = 'any';
    this.sortByElement.value = 'recommended';
  }

  /**
   * Render hospitals list with pagination
   */
  renderHospitals() {
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
      
      document.getElementById('resetFiltersBtn').addEventListener('click', () => {
        this.resetFilters();
        this.filteredHospitals = [...this.dataService.hospitalsData];
        this.renderHospitals();
      });
      
      this.paginationElement.innerHTML = '';
      return;
    }
    
    // Generate hospital cards
    const hospitalCards = hospitalsToShow.map(hospital => this.createHospitalCard(hospital)).join('');
    this.hospitalListElement.innerHTML = hospitalCards;
    
    // Add event listeners to hospital cards
    hospitalsToShow.forEach((hospital, index) => {
      const compareBtn = document.getElementById(`compare-${hospital.Id}`);
      const detailsBtn = document.getElementById(`details-${hospital.Id}`);
      
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
  if (this.userLocation) {
    const distance = this.dataService.calculateDistance(
      this.userLocation.lat, 
      this.userLocation.lon, 
      hospital.LAT, 
      hospital.LON
    ).toFixed(1);
    
    distanceText = `${distance} miles away • `;
  }
  
  // Determine cost indicator class
  const procedure = 'hip-replacement';
  const cost = hospital.costs[procedure];
  let costClass = 'cost-medium';
  
  if (cost < 15000) costClass = 'cost-low';
  if (cost > 20000) costClass = 'cost-high';
  
  // Generate random specialties for demo
  const specialties = this.getRandomSpecialties(hospital.Id);
  
  // Check if hospital is in compare list
  const isCompared = this.selectedHospitals.some(h => h.Id === hospital.Id);
  const compareButtonClass = isCompared ? 'btn-primary' : 'btn-outline';
  const compareButtonText = isCompared ? 'Remove' : 'Compare';
  
  return `
    <div class="hospital-card">
      <div class="hospital-content">
        <div class="hospital-header">
          <h4 class="hospital-name">${hospital.NAME}</h4>
          <div class="hospital-rating">
            <span>${hospital.rating}</span>
            <span class="reviews">(${hospital.reviews} reviews)</span>
          </div>
        </div>
        
        <div class="hospital-info">
          ${distanceText}${hospital.ADDRESS}, ${hospital.CITY}, ${hospital.STATE}
        </div>
        
        <div class="hospital-specialties">
          ${specialties.map(s => `<span class="specialty-tag">${s}</span>`).join('')}
        </div>
        
        <div class="hospital-footer">
          <div class="estimated-cost">
            <div>Estimated Cost</div>
            <div class="cost-indicator ${costClass}">$${cost.toLocaleString()}</div>
          </div>
          
          <div class="hospital-actions">
            <button class="btn ${compareButtonClass}" id="compare-${hospital.Id}">${compareButtonText}</button>
            <button class="btn btn-primary" id="details-${hospital.Id}">View Details</button>
          </div>
        </div>
      </div>
    </div>
  `;
}
  /**
   * Get random specialties for a hospital (for demo purposes)
   * @param {string} hospitalId - Hospital ID
   * @returns {Array} Array of specialties
   */
  getRandomSpecialties(hospitalId) {
    const allSpecialties = [
      'Orthopedics', 'Cardiology', 'Neurology', 'Oncology', 
      'General Surgery', 'Pediatrics', 'Geriatric Care', 
      'Physical Therapy', 'Joint Replacement', 'Research Hospital'
    ];
    
    // Use hospital ID to deterministically select specialties
    const hash = hospitalId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const numSpecialties = (Math.abs(hash) % 3) + 1; // 1-3 specialties
    const specialties = [];
    
    for (let i = 0; i < numSpecialties; i++) {
      const index = (Math.abs(hash) + i) % allSpecialties.length;
      specialties.push(allSpecialties[index]);
    }
    
    return specialties;
  }

  /**
   * Render pagination controls
   */
  renderPagination() {
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
        this.hospitalListElement.scrollIntoView({ behavior: 'smooth' });
      });
    });
  }

  /**
   * Toggle hospital in compare list
   * @param {Object} hospital - Hospital to toggle
   */
  toggleCompare(hospital) {
    const index = this.selectedHospitals.findIndex(h => h.Id === hospital.Id);
    
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
    
    // Update chart with selected hospitals
    window.chartService.updateComparisonChart(this.selectedHospitals);
    
    // Re-render hospitals to update compare buttons
    this.renderHospitals();
  }

  /**
   * Show hospital details
   * @param {Object} hospital - Hospital to show details for
   */
  showHospitalDetails(hospital) {
    // In a real application, this would navigate to a details page
    // For demonstration, we'll just log the hospital details
    console.log('Hospital details:', hospital);
    alert(`Viewing details for ${hospital.NAME} - This would navigate to a details page in a real application.`);
  }

  /**
   * Toggle map view
   */
  // toggleMapView() {
  //   // In a real application, this would show a map view of hospitals
  //   alert('Map view would be displayed here in a real application.');
  // }

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
