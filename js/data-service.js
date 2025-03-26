/**
 * Data Service for HealthCare Compass
 * Handles loading and parsing CSV data
 */

class DataService {
  constructor() {
    this.hospitalsData = [];
    this.diseasesData = []; // Will be populated when the second CSV is provided
    this.dataLoaded = false;
  }

  /**
   * Load hospitals data from CSV file
   * @returns {Promise} Promise that resolves when data is loaded
   */
  async loadHospitalsData() {
    try {
      const response = await fetch('./data/organizations.csv');
      const csvData = await response.text();
      this.hospitalsData = this.parseCSV(csvData);
      this.dataLoaded = true;
      console.log(`Loaded ${this.hospitalsData.length} hospitals`);
      return this.hospitalsData;
    } catch (error) {
      console.error('Error loading hospitals data:', error);
      throw error;
    }
  }

  /**
   * Parse CSV data into array of objects
   * @param {string} csvText - Raw CSV text
   * @returns {Array} Array of objects representing CSV rows
   */
  parseCSV(csvText) {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',');
    
    return lines.slice(1).filter(line => line.trim() !== '').map(line => {
      const values = this.parseCSVLine(line);
      const entry = {};
      
      headers.forEach((header, index) => {
        // Convert numeric values
        if (['LAT', 'LON', 'REVENUE', 'UTILIZATION'].includes(header)) {
          entry[header] = values[index] ? parseFloat(values[index]) : 0;
        } else {
          entry[header] = values[index] || '';
        }
      });
      
      return entry;
    });
  }

  /**
   * Parse a single CSV line, handling quoted values correctly
   * @param {string} line - CSV line to parse
   * @returns {Array} Array of values
   */
  parseCSVLine(line) {
    const values = [];
    let currentValue = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(currentValue);
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    
    values.push(currentValue); // Add the last value
    return values;
  }

  /**
   * Search hospitals by name, city, or state
   * @param {string} query - Search query
   * @returns {Array} Filtered hospitals
   */
  searchHospitals(query) {
    if (!query) return this.hospitalsData;
    
    const searchTerms = query.toLowerCase().split(' ');
    
    return this.hospitalsData.filter(hospital => {
      const searchableText = `${hospital.NAME} ${hospital.CITY} ${hospital.STATE}`.toLowerCase();
      return searchTerms.every(term => searchableText.includes(term));
    });
  }

  /**
   * Filter hospitals by location (city or state)
   * @param {string} location - Location to filter by
   * @returns {Array} Filtered hospitals
   */
  filterByLocation(location) {
    if (!location) return this.hospitalsData;
    
    const locationLower = location.toLowerCase();
    
    return this.hospitalsData.filter(hospital => 
      hospital.CITY.toLowerCase().includes(locationLower) || 
      hospital.STATE.toLowerCase().includes(locationLower) ||
      hospital.ZIP.includes(locationLower)
    );
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * @param {number} lat1 - Latitude of first point
   * @param {number} lon1 - Longitude of first point
   * @param {number} lat2 - Latitude of second point
   * @param {number} lon2 - Longitude of second point
   * @returns {number} Distance in miles
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 3958.8; // Earth's radius in miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   * @param {number} degrees - Angle in degrees
   * @returns {number} Angle in radians
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Filter hospitals by distance from a reference point
   * @param {Array} hospitals - Hospitals to filter
   * @param {Object} referencePoint - Reference point {lat, lon}
   * @param {number} maxDistance - Maximum distance in miles
   * @returns {Array} Filtered hospitals with distance added
   */
  filterByDistance(hospitals, referencePoint, maxDistance) {
    if (!referencePoint || !maxDistance) return hospitals;
    
    return hospitals.map(hospital => {
      const distance = this.calculateDistance(
        referencePoint.lat, 
        referencePoint.lon, 
        hospital.LAT, 
        hospital.LON
      );
      
      return { ...hospital, distance };
    }).filter(hospital => hospital.distance <= maxDistance);
  }

  /**
   * Get user's current location
   * @returns {Promise} Promise that resolves with {lat, lon}
   */
  getUserLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        position => {
          resolve({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
        },
        error => {
          console.warn('Error getting location:', error.message);
          // Default to center of US if location access is denied
          resolve({ lat: 39.8283, lon: -98.5795 });
        }
      );
    });
  }

  /**
   * Generate mock ratings for hospitals (since the CSV doesn't have ratings)
   * This would be replaced with actual ratings data in a production environment
   * @returns {void}
   */
  generateMockRatings() {
    this.hospitalsData.forEach(hospital => {
      // Generate a random rating between 3.0 and 5.0
      hospital.rating = (3 + Math.random() * 2).toFixed(1);
      // Generate a random number of reviews
      hospital.reviews = Math.floor(50 + Math.random() * 300);
    });
  }

  /**
   * Generate mock cost data for hospitals (since the CSV doesn't have cost data)
   * This would be replaced with actual cost data in a production environment
   * @returns {void}
   */
  generateMockCostData() {
    const procedures = {
      'hip-replacement': { min: 10000, max: 25000 },
      'knee-replacement': { min: 12000, max: 28000 },
      'cardiac-bypass': { min: 30000, max: 60000 },
      'mri': { min: 500, max: 3000 },
      'physical-therapy': { min: 75, max: 200 }
    };
    
    this.hospitalsData.forEach(hospital => {
      hospital.costs = {};
      
      Object.keys(procedures).forEach(procedure => {
        const range = procedures[procedure];
        hospital.costs[procedure] = Math.floor(range.min + Math.random() * (range.max - range.min));
      });
    });
  }
}

// Create and export a singleton instance
const dataService = new DataService();
