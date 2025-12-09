import { requireAdminAuth } from './session.js';
import { handleLogout } from './logout.js';
import { supabase } from './client.js';

// Delete shipment from database
async function deleteShipment(shipmentId) {
  try {
    // Delete shipment (timeline entries will be deleted automatically due to CASCADE)
    const { error } = await supabase
      .from('shipments')
      .delete()
      .eq('id', shipmentId);
    
    if (error) {
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting shipment:', error);
    throw error;
  }
}

// Show delete confirmation modal
function showDeleteConfirmation(trackingId, shipmentId) {
  return new Promise((resolve) => {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.id = 'delete-confirmation-modal';
    modal.className = 'fixed z-50 inset-0 overflow-y-auto';
    modal.innerHTML = `
      <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
        <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
              <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6 text-red-600">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              </div>
              <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                  Delete Shipment
                </h3>
                <div class="mt-2">
                  <p class="text-sm text-gray-500">
                    Are you sure you want to delete shipment <span class="font-medium">${trackingId}</span>? This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              id="confirm-delete-btn"
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Delete
            </button>
            <button
              type="button"
              id="cancel-delete-btn"
              class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Handle confirm button
    const confirmBtn = document.getElementById('confirm-delete-btn');
    const cancelBtn = document.getElementById('cancel-delete-btn');
    const backdrop = modal.querySelector('.fixed.inset-0.bg-gray-500');
    
    const cleanup = () => {
      document.body.removeChild(modal);
    };
    
    confirmBtn.addEventListener('click', () => {
      cleanup();
      resolve(true);
    });
    
    cancelBtn.addEventListener('click', () => {
      cleanup();
      resolve(false);
    });
    
    backdrop.addEventListener('click', () => {
      cleanup();
      resolve(false);
    });
  });
}

// Store shipments data
let shipments = [];

// Get status class based on status
function getStatusClass(status) {
  if (status === "Delivered") {
    return 'bg-green-100 text-green-800';
  } else if (status === "In Transit") {
    return 'bg-blue-100 text-blue-800';
  } else if (status === "Processing") {
    return 'bg-yellow-100 text-yellow-800';
  } else if (status === "At Destination") {
    return 'bg-purple-100 text-purple-800';
  } else if (status === "Picked Up") {
    return 'bg-indigo-100 text-indigo-800';
  } else {
    return 'bg-gray-100 text-gray-800';
  }
}

// Format date for display
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Fetch shipments from database
async function fetchShipments() {
  try {
    const { data, error } = await supabase
      .from('shipments')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching shipments:', error);
    return [];
  }
}

// Update stats cards
function updateStatsCards(shipmentsData) {
  const totalShipments = shipmentsData.length;
  const inTransit = shipmentsData.filter(s => s.status === 'In Transit').length;
  const delivered = shipmentsData.filter(s => s.status === 'Delivered').length;
  const processing = shipmentsData.filter(s => s.status === 'Processing').length;
  
  const totalEl = document.getElementById('total-shipments');
  const inTransitEl = document.getElementById('in-transit-count');
  const deliveredEl = document.getElementById('delivered-count');
  const processingEl = document.getElementById('processing-count');
  
  if (totalEl) totalEl.textContent = totalShipments;
  if (inTransitEl) inTransitEl.textContent = inTransit;
  if (deliveredEl) deliveredEl.textContent = delivered;
  if (processingEl) processingEl.textContent = processing;
}

// Load shipments into the table
function loadShipments(shipmentsData = shipments) {
  const tableBody = document.getElementById('shipments-table-body');
  if (!tableBody) return;
  
  // Remove loading row
  const loadingRow = document.getElementById('loading-row');
  if (loadingRow) {
    loadingRow.remove();
  }
  
  tableBody.innerHTML = '';
  
  if (shipmentsData.length === 0) {
    const noResults = document.getElementById('no-results');
    if (noResults) noResults.classList.remove('hidden');
    return;
  }
  
  const noResults = document.getElementById('no-results');
  if (noResults) noResults.classList.add('hidden');
  
  shipmentsData.forEach(shipment => {
    const row = document.createElement('tr');
    const statusClass = getStatusClass(shipment.status);
    const date = formatDate(shipment.created_at);
    
    row.innerHTML = `
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">
        ${shipment.tracking_id || shipment.id}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        ${shipment.sender_name || 'N/A'}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        ${shipment.receiver_name || 'N/A'}
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
          ${shipment.status || 'Processing'}
        </span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        ${date}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <a href="/admin/shipment-details?id=${shipment.id}" class="text-primary hover:text-primary-dark mr-4">
          View
        </a>
        <a href="/admin/shipment-details?id=${shipment.id}#update" class="text-secondary hover:text-secondary-dark mr-4">
          Update
        </a>
        <button 
          type="button"
          class="text-red-600 hover:text-red-800 delete-shipment-btn"
          data-shipment-id="${shipment.id}"
          data-tracking-id="${shipment.tracking_id || shipment.id}"
        >
          Delete
        </button>
      </td>
    `;
    
    tableBody.appendChild(row);
  });
  
  // Update counts
  const resultsCount = document.getElementById('results-count');
  const totalCount = document.getElementById('total-count');
  if (resultsCount) resultsCount.textContent = shipmentsData.length;
  if (totalCount) totalCount.textContent = shipments.length;
}


// Mobile sidebar toggle
function setupEventListeners() {
  const openSidebarBtn = document.getElementById('open-sidebar-button');
  const closeSidebarBtn = document.getElementById('close-sidebar-button');
  const sidebarBackdrop = document.getElementById('mobile-sidebar-backdrop');
  const mobileSidebar = document.getElementById('mobile-sidebar');
  
  if (openSidebarBtn && mobileSidebar) {
    openSidebarBtn.addEventListener('click', function() {
      mobileSidebar.classList.remove('hidden');
    });
  }

  if (closeSidebarBtn && mobileSidebar) {
    closeSidebarBtn.addEventListener('click', function() {
      mobileSidebar.classList.add('hidden');
    });
  }

  if (sidebarBackdrop && mobileSidebar) {
    sidebarBackdrop.addEventListener('click', function() {
      mobileSidebar.classList.add('hidden');
    });
  }

  // Logout functionality
  const logoutButtons = [
    document.getElementById('mobile-logout-button'),
    document.getElementById('desktop-logout-button')
  ];

  logoutButtons.forEach(button => {
    if (button) {
      button.addEventListener('click', async function() {
        await handleLogout();
      });
    }
  });
  
  
  // Delete shipment handlers (delegated event listener)
  const tableBody = document.getElementById('shipments-table-body');
  if (tableBody) {
    tableBody.addEventListener('click', async function(e) {
      if (e.target.classList.contains('delete-shipment-btn')) {
        const button = e.target;
        const shipmentId = button.getAttribute('data-shipment-id');
        const trackingId = button.getAttribute('data-tracking-id');
        
        if (!shipmentId) return;
        
        // Show confirmation modal
        const confirmed = await showDeleteConfirmation(trackingId, shipmentId);
        
        if (confirmed) {
          // Disable button and show loading
          button.disabled = true;
          const originalText = button.textContent;
          button.textContent = 'Deleting...';
          button.classList.add('opacity-50', 'cursor-not-allowed');
          
          try {
            // Delete shipment
            await deleteShipment(shipmentId);
            
            // Remove from local array
            shipments = shipments.filter(s => s.id !== shipmentId);
            
            // Reload shipments
            loadShipments();
            
            // Update stats
            updateStatsCards(shipments);
          } catch (error) {
            console.error('Error deleting shipment:', error);
            alert('Failed to delete shipment. Please try again.');
            
            // Reset button
            button.disabled = false;
            button.textContent = originalText;
            button.classList.remove('opacity-50', 'cursor-not-allowed');
          }
        }
      }
    });
  }
}

// Initialize page
document.addEventListener('DOMContentLoaded', async function() {
  // Require authentication - will redirect if not authenticated
  await requireAdminAuth({ redirectTo: '/admin-login' });
  
  // Fetch shipments from database
  shipments = await fetchShipments();
  
  // Update stats cards
  updateStatsCards(shipments);
  
  // Load shipment data
  loadShipments();
  
  // Set up event listeners
  setupEventListeners();
});

