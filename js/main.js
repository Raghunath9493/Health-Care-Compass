/**
 * Main JavaScript file for HealthCare Compass
 * Initializes services and coordinates application functionality
 */

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialize services
  window.dataService = new DataService();
  window.chartService = new ChartService();
  window.hospitalService = new HospitalService(window.dataService);
  
  // Initialize application
  initializeApp();
  
  // Initialize slider functionality
  initializeSlider();
});

/**
 * Initialize the application
 */
async function initializeApp() {
  try {
    // Show loading indicator
    showLoadingIndicator(true);
    
    // Initialize hospital data
    await window.dataService.loadHospitalsData();
    
    // Initialize hospital service
    await window.hospitalService.initialize();
    
    // Add event listeners for global actions
    addGlobalEventListeners();
    
    // Initialize file upload for disease data
    initializeFileUpload();
    
    console.log('HealthCare Compass application initialized successfully');
    
    // Hide loading indicator
    showLoadingIndicator(false);
  } catch (error) {
    console.error('Error initializing application:', error);
    showErrorMessage('Failed to initialize application. Please refresh the page and try again.');
    showLoadingIndicator(false);
  }
}

/**
 * Add event listeners for global actions
 */
function addGlobalEventListeners() {
  // Add event listener for treatment selection in comparison section
  const treatmentSelect = document.getElementById('treatmentSelect');
  if (treatmentSelect) {
    treatmentSelect.addEventListener('change', function() {
      const treatment = treatmentSelect.value;
      window.chartService.updateComparisonChart(window.hospitalService.selectedHospitals, treatment);
    });
  }
  
  // Add event listener for download report button
  const downloadReportBtn = document.getElementById('downloadReportBtn');
  if (downloadReportBtn) {
    downloadReportBtn.addEventListener('click', function() {
      window.chartService.createCostReport(window.hospitalService.selectedHospitals);
    });
  }
  
  // Add event listener for reset filters button
  const resetFiltersBtn = document.getElementById('resetFiltersBtn');
  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', function() {
      window.hospitalService.resetFilters();
    });
  }
}

/**
 * Initialize hospital slider functionality
 */
function initializeSlider() {
  const slider = document.getElementById('hospitalSlider');
  const prevBtn = document.getElementById('prevHospital');
  const nextBtn = document.getElementById('nextHospital');
  
  if (!slider || !prevBtn || !nextBtn) return;
  
  let currentIndex = 0;
  const cardsPerView = window.innerWidth > 992 ? 3 : window.innerWidth > 768 ? 2 : 1;
  
  function updateSlider() {
    const cardWidth = slider.querySelector('.hospital-card')?.offsetWidth || 0;
    const gap = 20;
    slider.style.transform = `translateX(-${currentIndex * (cardWidth + gap)}px)`;
    prevBtn.disabled = currentIndex === 0;
    const totalCards = slider.querySelectorAll('.hospital-card').length;
    nextBtn.disabled = currentIndex >= totalCards - cardsPerView;
  }

  prevBtn.addEventListener('click', () => {
    if (currentIndex > 0) {
      currentIndex--;
      updateSlider();
    }
  });

  nextBtn.addEventListener('click', () => {
    const totalCards = slider.querySelectorAll('.hospital-card').length;
    if (currentIndex < totalCards - cardsPerView) {
      currentIndex++;
      updateSlider();
    }
  });

  window.addEventListener('resize', () => {
    currentIndex = 0;
    updateSlider();
  });
  
  // Delay to ensure cards are rendered
  setTimeout(updateSlider, 500);
}

/**
 * Initialize file upload for disease data
 */
function initializeFileUpload() {
  const fileUploadInput = document.getElementById('diseaseDataUpload');
  if (!fileUploadInput) return;
  
  fileUploadInput.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Check if file is CSV
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      showErrorMessage('Please upload a CSV file.');
      return;
    }
    
    // Read file
    const reader = new FileReader();
    reader.onload = function(e) {
      const csvData = e.target.result;
      handleDiseaseDataUpload(csvData);
    };
    reader.onerror = function() {
      showErrorMessage('Error reading file.');
    };
    reader.readAsText(file);
  });
}

/**
 * Handle adding a second CSV file with disease data
 * @param {string} csvData - Raw CSV data
 */
function handleDiseaseDataUpload(csvData) {
  try {
    // Parse the CSV data
    const diseaseData = window.dataService.parseCSV(csvData);
    
    // Store the disease data in the data service
    window.dataService.diseasesData = diseaseData;
    
    // Update the UI to show disease-related functionality
    enableDiseaseSearch();
    
    // Show success message
    showSuccessMessage(`Successfully loaded ${diseaseData.length} disease records.`);
    
    console.log(`Loaded ${diseaseData.length} disease records`);
  } catch (error) {
    console.error('Error processing disease data:', error);
    showErrorMessage('Error processing disease data. Please check the file format and try again.');
  }
}

/**
 * Enable disease search functionality
 */
function enableDiseaseSearch() {
  // Update the search form to include disease search
  const treatmentInput = document.getElementById('treatment');
  if (treatmentInput) {
    treatmentInput.placeholder = 'Search by disease, treatment, or procedure';
  }
  
  // Update treatment select dropdown for comparison
  const treatmentSelect = document.getElementById('treatmentSelect');
  if (treatmentSelect && window.dataService.diseasesData.length > 0) {
    // Get unique disease names
    const diseases = [...new Set(window.dataService.diseasesData.map(d => d.DESCRIPTION))];
    
    // Add disease options to select
    diseases.forEach(disease => {
      const option = document.createElement('option');
      option.value = disease;
      option.textContent = disease;
      treatmentSelect.appendChild(option);
    });
  }
  
  // Show disease search section if hidden
  const diseaseSearchSection = document.getElementById('diseaseSearchSection');
  if (diseaseSearchSection) {
    diseaseSearchSection.classList.remove('hidden');
  }
}

/**
 * Show loading indicator
 * @param {boolean} show - Whether to show or hide the indicator
 */
function showLoadingIndicator(show) {
  let loadingIndicator = document.getElementById('loadingIndicator');
  
  if (!loadingIndicator) {
    loadingIndicator = document.createElement('div');
    loadingIndicator.id = 'loadingIndicator';
    loadingIndicator.className = 'loading-indicator';
    loadingIndicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading data...';
    document.body.appendChild(loadingIndicator);
  }
  
  loadingIndicator.style.display = show ? 'flex' : 'none';
}

/**
 * Show error message to user
 * @param {string} message - Error message to display
 */
function showErrorMessage(message) {
  const errorElement = document.createElement('div');
  errorElement.classList.add('error-message');
  errorElement.innerHTML = `
    <i class="fas fa-exclamation-circle"></i>
    <p>${message}</p>
    <button class="close-btn"><i class="fas fa-times"></i></button>
  `;
  
  // Find a suitable container to show the error
  const container = document.querySelector('.dashboard') || document.body;
  container.prepend(errorElement);
  
  // Add close button functionality
  const closeBtn = errorElement.querySelector('.close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', function() {
      errorElement.remove();
    });
  }
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (errorElement.parentNode) {
      errorElement.remove();
    }
  }, 5000);
}

/**
 * Show success message to user
 * @param {string} message - Success message to display
 */
function showSuccessMessage(message) {
  const successElement = document.createElement('div');
  successElement.classList.add('success-message');
  successElement.innerHTML = `
    <i class="fas fa-check-circle"></i>
    <p>${message}</p>
    <button class="close-btn"><i class="fas fa-times"></i></button>
  `;
  
  // Find a suitable container to show the message
  const container = document.querySelector('.dashboard') || document.body;
  container.prepend(successElement);
  
  // Add close button functionality
  const closeBtn = successElement.querySelector('.close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', function() {
      successElement.remove();
    });
  }
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (successElement.parentNode) {
      successElement.remove();
    }
  }, 5000);
}
// Function to load top hospitals by utilization
function loadTopHospitals() {
  // Get top 10 hospitals by utilization from your data service
  const topHospitals = hospitalService.getTopHospitalsByUtilization(10);
  const topHospitalsContainer = document.getElementById('topHospitalsList');
  
  if (!topHospitalsContainer) return;
  
  topHospitalsContainer.innerHTML = '';
  
  topHospitals.forEach((hospital, index) => {
    const hospitalCard = document.createElement('div');
    hospitalCard.className = 'top-hospital-card';
    
    hospitalCard.innerHTML = `
      <div class="top-hospital-header">
        <span class="top-hospital-rank">${index + 1}</span>
        <span class="top-hospital-name">${hospital.name}</span>
      </div>
      <div class="top-hospital-location">
        <i class="fas fa-map-marker-alt"></i> ${hospital.city}, ${hospital.state}
      </div>
      <div class="top-hospital-stats">
        <div class="top-hospital-stat">
          <div class="stat-value">${hospital.utilization.toLocaleString()}</div>
          <div class="stat-label">Patients</div>
        </div>
        <div class="top-hospital-stat">
          <div class="stat-value">${hospital.rating || 'N/A'}</div>
          <div class="stat-label">Rating</div>
        </div>
      </div>
    `;
    
    topHospitalsContainer.appendChild(hospitalCard);
  });
}

// Call this function when the page loads
document.addEventListener('DOMContentLoaded', function() {
  // Existing code...
  
  // Load top hospitals
  loadTopHospitals();
});