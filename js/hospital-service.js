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
    this.loadingIndicatorElement = document.createElement('div'); // Dynamic loading indicator
    this.loadingIndicatorElement.className = 'loading-indicator';
    this.loadingIndicatorElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading hospitals...';
    
    this.sliderElement = document.getElementById('hospitalSlider');
    
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
    
    this.initEventListeners();
  }

  initEventListeners() {
    if (this.searchFormElement) {
      this.searchFormElement.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSearch();
      });
    }
    
    const filterElements = [
      this.budgetFilterElement,
      this.specialtyFilterElement,
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

  async initialize() {
    this.showLoading(true);
    try {
      await this.dataService.loadHospitalsData();
      this.dataService.generateMockRatings();
      this.dataService.generateMockCostData();
      try {
        this.userLocation = await this.dataService.getUserLocation();
      } catch (error) {
        console.warn('Could not get user location:', error);
      }
      this.filteredHospitals = [...this.dataService.hospitalsData];
      this.applyFilters();
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

  async handleSearch() {
    const treatment = this.treatmentInputElement.value.trim();
    const location = this.locationInputElement.value.trim();
    
    this.showLoading(true);
    if (this.hospitalListElement) this.hospitalListElement.innerHTML = '';
    
    try {
      const hospitals = await this.dataService.searchHospitals(treatment, location);
      this.filteredHospitals = hospitals;
      this.currentPage = 1;
      this.applyFilters();
    } catch (error) {
      console.error('Error during search:', error);
      if (this.hospitalListElement) {
        this.hospitalListElement.innerHTML = '<p>Error loading hospitals. Please try again.</p>';
      }
    } finally {
      this.showLoading(false);
    }
  }

  applyFilters() {
    this.showLoading(true);
    let results = this.filteredHospitals.length ? [...this.filteredHospitals] : [...this.dataService.hospitalsData];
    
    const budgetFilter = this.budgetFilterElement.value;
    if (budgetFilter !== 'any') {
      results = this.filterByBudget(results, budgetFilter);
    }
    
    const specialtyFilter = this.specialtyFilterElement.value;
    if (specialtyFilter !== 'all') {
      results = this.filterBySpecialty(results, specialtyFilter);
    }
    
    const distanceFilter = parseInt(this.distanceFilterElement.value);
    if (!isNaN(distanceFilter) && this.userLocation) {
      results = this.dataService.filterByDistance(results, this.userLocation, distanceFilter);
    }
    
    const ratingFilter = parseInt(this.ratingFilterElement.value);
    if (!isNaN(ratingFilter)) {
      results = results.filter(hospital => parseFloat(hospital.rating) >= ratingFilter);
    }
    
    const sortBy = this.sortByElement.value;
    results = this.sortHospitals(results, sortBy);
    
    this.filteredHospitals = results;
    this.currentPage = 1;
    this.renderHospitals();
    this.showLoading(false);
  }

  filterByBudget(hospitals, budgetRange) {
    const procedure = 'hip-replacement';
    switch (budgetRange) {
      case '0-1000': return hospitals.filter(h => h.costs[procedure] < 1000);
      case '1000-5000': return hospitals.filter(h => h.costs[procedure] >= 1000 && h.costs[procedure] < 5000);
      case '5000-10000': return hospitals.filter(h => h.costs[procedure] >= 5000 && h.costs[procedure] < 10000);
      case '10000+': return hospitals.filter(h => h.costs[procedure] >= 10000);
      default: return hospitals;
    }
  }

  filterBySpecialty(hospitals, specialty) {
    return hospitals.filter(hospital => {
      const specialties = this.getRandomSpecialties(hospital.Id);
      return specialties.includes(specialty.charAt(0).toUpperCase() + specialty.slice(1));
    });
  }

  sortHospitals(hospitals, sortBy) {
    const procedure = 'hip-replacement';
    switch (sortBy) {
      case 'price-low': return [...hospitals].sort((a, b) => a.costs[procedure] - b.costs[procedure]);
      case 'price-high': return [...hospitals].sort((a, b) => b.costs[procedure] - a.costs[procedure]);
      case 'rating-high': return [...hospitals].sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
      case 'distance':
        if (this.userLocation) {
          return [...hospitals].sort((a, b) => {
            const distA = this.dataService.calculateDistance(this.userLocation.lat, this.userLocation.lon, a.LAT, a.LON);
            const distB = this.dataService.calculateDistance(this.userLocation.lat, this.userLocation.lon, b.LAT, b.LON);
            return distA - distB;
          });
        }
        return hospitals;
      case 'recommended':
      default:
        return [...hospitals].sort((a, b) => {
          const ratingA = parseFloat(a.rating) || 0;
          const ratingB = parseFloat(b.rating) || 0;
          if (this.userLocation) {
            const distA = this.dataService.calculateDistance(this.userLocation.lat, this.userLocation.lon, a.LAT, a.LON);
            const distB = this.dataService.calculateDistance(this.userLocation.lat, this.userLocation.lon, b.LAT, b.LON);
            const scoreA = ratingA - (distA / 100);
            const scoreB = ratingB - (distB / 100);
            return scoreB - scoreA;
          }
          return ratingB - ratingA;
        });
    }
  }

  resetFilters() {
    this.budgetFilterElement.value = 'any';
    this.specialtyFilterElement.value = 'all';
    this.distanceFilterElement.value = 'any';
    this.ratingFilterElement.value = 'any';
    this.sortByElement.value = 'recommended';
    this.applyFilters();
  }

  renderHospitals() {
    if (!this.hospitalListElement || !this.sliderElement) return;

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
      this.sliderElement.innerHTML = '';
      if (this.paginationElement) this.paginationElement.innerHTML = '';
      const resetBtn = document.getElementById('resetFiltersBtn');
      if (resetBtn) resetBtn.addEventListener('click', () => this.resetFilters());
      return;
    }
    
    const hospitalCards = hospitalsToShow.map(hospital => this.createHospitalCard(hospital)).join('');
    this.hospitalListElement.innerHTML = hospitalCards;
    this.sliderElement.innerHTML = hospitalCards; // Populate slider with same cards
    
    hospitalsToShow.forEach(hospital => {
      const compareBtn = document.getElementById(`compare-${hospital.Id}`);
      const detailsBtn = document.getElementById(`details-${hospital.Id}`);
      if (compareBtn) compareBtn.addEventListener('click', () => this.toggleCompare(hospital));
      if (detailsBtn) detailsBtn.addEventListener('click', () => this.showHospitalDetails(hospital));
    });
    
    this.renderPagination();
  }

  createHospitalCard(hospital) {
    let distanceText = this.userLocation ? 
      `${this.dataService.calculateDistance(this.userLocation.lat, this.userLocation.lon, hospital.LAT, hospital.LON).toFixed(1)} miles away • ` : '';
    const procedure = 'hip-replacement';
    const cost = hospital.costs[procedure];
    let costClass = cost < 15000 ? 'cost-low' : cost > 20000 ? 'cost-high' : 'cost-medium';
    const specialties = this.getRandomSpecialties(hospital.Id);
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

  getRandomSpecialties(hospitalId) {
    const allSpecialties = [
      'Orthopedics', 'Cardiology', 'Neurology', 'Oncology', 
      'General Surgery', 'Pediatrics', 'Geriatric Care', 
      'Physical Therapy', 'Joint Replacement', 'Research Hospital'
    ];
    const hash = hospitalId.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0) & 0x7fffffff;
    const numSpecialties = (hash % 3) + 1;
    const specialties = [];
    for (let i = 0; i < numSpecialties; i++) {
      const index = (hash + i) % allSpecialties.length;
      specialties.push(allSpecialties[index]);
    }
    return specialties;
  }

  renderPagination() {
    if (!this.paginationElement) return;
    
    const totalPages = Math.ceil(this.filteredHospitals.length / this.itemsPerPage);
    if (totalPages <= 1) {
      this.paginationElement.innerHTML = '';
      return;
    }
    
    const maxVisiblePages = 5;
    const halfVisible = Math.floor(maxVisiblePages / 2);
    let startPage = Math.max(1, this.currentPage - halfVisible);
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    let paginationHTML = '';
    if (this.currentPage > 1) {
      paginationHTML += `<div class="pagination-item" data-page="${this.currentPage - 1}"><i class="fas fa-chevron-left"></i></div>`;
    }
    
    for (let i = startPage; i <= endPage; i++) {
      paginationHTML += `
        <div class="pagination-item ${i === this.currentPage ? 'active' : ''}" data-page="${i}">${i}</div>
      `;
    }
    
    if (this.currentPage < totalPages) {
      paginationHTML += `<div class="pagination-item" data-page="${this.currentPage + 1}"><i class="fas fa-chevron-right"></i></div>`;
    }
    
    this.paginationElement.innerHTML = paginationHTML;
    
    const paginationItems = this.paginationElement.querySelectorAll('.pagination-item[data-page]');
    paginationItems.forEach(item => {
      item.addEventListener('click', () => {
        this.currentPage = parseInt(item.dataset.page);
        this.renderHospitals();
        if (this.hospitalListElement) this.hospitalListElement.scrollIntoView({ behavior: 'smooth' });
      });
    });
  }

  toggleCompare(hospital) {
    const index = this.selectedHospitals.findIndex(h => h.Id === hospital.Id);
    if (index === -1) {
      if (this.selectedHospitals.length >= 3) {
        alert('You can compare up to 3 hospitals at a time. Please remove one first.');
        return;
      }
      this.selectedHospitals.push(hospital);
    } else {
      this.selectedHospitals.splice(index, 1);
    }
    window.chartService.updateComparisonChart(this.selectedHospitals);
    this.renderHospitals();
  }

  showHospitalDetails(hospital) {
    console.log('Hospital details:', hospital);
    alert(`Viewing details for ${hospital.NAME} - This would navigate to a details page in a real application.`);
  }

  showLoading(show) {
    if (!this.hospitalListElement) return;
    if (show) {
      this.hospitalListElement.appendChild(this.loadingIndicatorElement);
    } else {
      if (this.loadingIndicatorElement.parentNode) {
        this.hospitalListElement.removeChild(this.loadingIndicatorElement);
      }
    }
  }
}

// Will be initialized in main.js
