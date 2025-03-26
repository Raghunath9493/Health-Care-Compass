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
});

/**
 * Initialize the application
 */
async function initializeApp() {
  try {
    // Initialize hospital data
    await window.hospitalService.initialize();
    
    // Initialize chart with default data
    window.chartService.initializeChart();
    
    // Add event listeners for global actions
    addGlobalEventListeners();
    
    console.log('HealthCare Compass application initialized successfully');
  } catch (error) {
    console.error('Error initializing application:', error);
    showErrorMessage('Failed to initialize application. Please refresh the page and try again.');
  }
}

/**
 * Add event listeners for global actions
 */
function addGlobalEventListeners() {
  // Example: Add event listener for map view toggle
  // const mapViewBtn = document.getElementById('mapViewBtn');
  // if (mapViewBtn) {
  //   mapViewBtn.addEventListener('click', toggleMapView);
  // }
  
  // Example: Add event listener for procedure selection
  const procedureSelect = document.getElementById('procedureSelect');
  if (procedureSelect) {
    procedureSelect.addEventListener('change', function() {
      window.chartService.updateComparisonChart(window.hospitalService.selectedHospitals);
    });
  }
}

/**
 * Toggle map view
 */
// function toggleMapView() {
//   // In a real application, this would show a map with hospital locations
//   // For demonstration, we'll just show an alert
//   alert('Map view would be displayed here in a real application.');
  
  // Example of how this might work in a real application:
  // 1. Create a map container
  // const mapContainer = document.createElement('div');
  // mapContainer.id = 'hospitalMap';
  // mapContainer.classList.add('hospital-map');
  // document.querySelector('.dashboard-main').appendChild(mapContainer);
  
  // 2. Initialize map (using a library like Leaflet or Google Maps)
  // const map = L.map('hospitalMap').setView([39.8283, -98.5795], 4);
  // L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
  
  // 3. Add markers for hospitals
  // window.hospitalService.filteredHospitals.forEach(hospital => {
  //   if (hospital.LAT && hospital.LON) {
  //     L.marker([hospital.LAT, hospital.LON])
  //       .addTo(map)
  //       .bindPopup(`<b>${hospital.NAME}</b><br>${hospital.ADDRESS}, ${hospital.CITY}, ${hospital.STATE}`);
  //   }
  // });
// }

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
  `;
  
  // Find a suitable container to show the error
  const container = document.querySelector('.dashboard') || document.body;
  container.prepend(errorElement);
}

/**
 * Handle adding a second CSV file with disease data
 * This function would be called when the second CSV file is provided
 * @param {string} csvData - Raw CSV data
 */
function handleDiseaseDataUpload(csvData) {
  // Parse the CSV data
  const diseaseData = window.dataService.parseCSV(csvData);
  
  // Store the disease data in the data service
  window.dataService.diseasesData = diseaseData;
  
  // Update the UI to show disease-related functionality
  enableDiseaseSearch();
  
  console.log(`Loaded ${diseaseData.length} disease records`);
}

/**
 * Enable disease search functionality
 * This would be implemented when the second CSV file is provided
 */
function enableDiseaseSearch() {
  // In a real application, this would update the UI to enable disease search
  // For demonstration, we'll just log a message
  console.log('Disease search functionality enabled');
  
  // Example of how this might work:
  // 1. Update the search form to include disease search
  // const treatmentInput = document.getElementById('treatment');
  // treatmentInput.placeholder = 'Search by disease, treatment, or procedure';
  
  // 2. Update the search handler to include disease data
  // const searchForm = document.getElementById('searchForm');
  // searchForm.addEventListener('submit', (e) => {
  //   e.preventDefault();
  //   const query = treatmentInput.value.trim();
  //   
  //   // Search for matching diseases
  //   const matchingDiseases = window.dataService.searchDiseases(query);
  //   
  //   // Find hospitals that treat these diseases
  //   const hospitals = window.dataService.getHospitalsForDiseases(matchingDiseases);
  //   
  //   // Update the UI with results
  //   window.hospitalService.filteredHospitals = hospitals;
  //   window.hospitalService.renderHospitals();
  // });
}


document.addEventListener('DOMContentLoaded', () => {
  const slider = document.getElementById('hospitalSlider');
  const prevBtn = document.getElementById('prevHospital');
  const nextBtn = document.getElementById('nextHospital');
  let currentIndex = 0;
  const cardsPerView = window.innerWidth > 992 ? 3 : window.innerWidth > 768 ? 2 : 1;
  
  function updateSlider() {
    const cardWidth = slider.querySelector('.hospital-card')?.offsetWidth || 0;
    const gap = 20; // Match the gap from CSS
    slider.style.transform = `translateX(-${currentIndex * (cardWidth + gap)}px)`;
    
    // Disable buttons at edges
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

  // Update on window resize
  window.addEventListener('resize', () => {
    currentIndex = 0;
    updateSlider();
  });
});