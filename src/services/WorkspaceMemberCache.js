// src/services/WorkspaceMemberCache.js - Workspace member caching service
import { supabase } from '../supabaseClient';

class WorkspaceMemberCache {
  constructor() {
    this.cache = new Map();
    this.ttl = 10 * 60 * 1000; // 10 minutes TTL
    this.subscribers = new Map();
  }

  /**
   * Get cache key for workspace members
   * @param {string} workspaceId - Workspace ID
   * @returns {string} Cache key
   */
  getCacheKey(workspaceId) {
    return `workspace_members_${workspaceId}`;
  }

  /**
   * Check if cached data is still valid
   * @param {Object} cacheEntry - Cache entry
   * @returns {boolean} True if valid
   */
  isValid(cacheEntry) {
    if (!cacheEntry) return false;
    return Date.now() - cacheEntry.timestamp < this.ttl;
  }

  /**
   * Get workspace members from cache or fetch from database
   * @param {string} workspaceId - Workspace ID
   * @param {boolean} forceRefresh - Force refresh from database
   * @returns {Promise<Array>} Array of workspace members
   */
  async getWorkspaceMembers(workspaceId, forceRefresh = false) {
    const cacheKey = this.getCacheKey(workspaceId);
    const cached = this.cache.get(cacheKey);

    // Return cached data if valid and not forcing refresh
    if (!forceRefresh && cached && this.isValid(cached)) {
      return cached.data;
    }

    try {
      // Fetch from database
      const { data: membersData, error: membersError } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', workspaceId);

      if (membersError) throw membersError;

      // Fetch user details for each member
      const membersWithUsers = [];
      if (membersData && membersData.length > 0) {
        for (const member of membersData) {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, email, full_name')
            .eq('id', member.user_id)
            .single();

          if (!userError && userData) {
            membersWithUsers.push({
              ...member,
              users: userData
            });
          } else {
            // Fallback for missing user data
            membersWithUsers.push({
              ...member,
              users: {
                id: member.user_id,
                email: 'Unknown User',
                full_name: 'Team Member'
              }
            });
          }
        }
      }

      // Cache the result
      this.cache.set(cacheKey, {
        data: membersWithUsers,
        timestamp: Date.now()
      });

      // Notify subscribers
      this.notifySubscribers(workspaceId, membersWithUsers);

      return membersWithUsers;
    } catch (error) {
      console.error('Error fetching workspace members:', error);
      
      // Return stale data if available
      if (cached) {
        console.warn('Returning stale workspace members data due to fetch error');
        return cached.data;
      }
      
      throw error;
    }
  }

  /**
   * Subscribe to workspace member updates
   * @param {string} workspaceId - Workspace ID
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(workspaceId, callback) {
    const cacheKey = this.getCacheKey(workspaceId);
    
    if (!this.subscribers.has(cacheKey)) {
      this.subscribers.set(cacheKey, new Set());
    }
    
    this.subscribers.get(cacheKey).add(callback);

    // Return unsubscribe function
    return () => {
      const subscribers = this.subscribers.get(cacheKey);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          this.subscribers.delete(cacheKey);
        }
      }
    };
  }

  /**
   * Notify subscribers of data changes
   * @param {string} workspaceId - Workspace ID
   * @param {Array} data - Updated data
   */
  notifySubscribers(workspaceId, data) {
    const cacheKey = this.getCacheKey(workspaceId);
    const subscribers = this.subscribers.get(cacheKey);
    
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in workspace member cache subscriber:', error);
        }
      });
    }
  }

  /**
   * Invalidate cache for a workspace
   * @param {string} workspaceId - Workspace ID
   */
  invalidate(workspaceId) {
    const cacheKey = this.getCacheKey(workspaceId);
    this.cache.delete(cacheKey);
  }

  /**
   * Clear all cached data
   */
  clearAll() {
    this.cache.clear();
    this.subscribers.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const entries = Array.from(this.cache.entries());
    const validEntries = entries.filter(([, entry]) => this.isValid(entry));
    
    return {
      totalEntries: entries.length,
      validEntries: validEntries.length,
      staleEntries: entries.length - validEntries.length,
      subscribers: this.subscribers.size,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Estimate memory usage (rough calculation)
   * @returns {number} Estimated memory usage in bytes
   */
  estimateMemoryUsage() {
    let size = 0;
    
    this.cache.forEach((entry, key) => {
      size += key.length * 2; // Rough string size
      size += JSON.stringify(entry).length * 2; // Rough object size
    });
    
    return size;
  }

  /**
   * Cleanup stale entries
   */
  cleanup() {
    const now = Date.now();
    const keysToDelete = [];
    
    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > this.ttl) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => {
      this.cache.delete(key);
    });
    
    return keysToDelete.length;
  }

  /**
   * Start automatic cleanup interval
   * @param {number} interval - Cleanup interval in milliseconds
   */
  startCleanupInterval(interval = 5 * 60 * 1000) { // 5 minutes default
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.cleanupInterval = setInterval(() => {
      const cleaned = this.cleanup();
      if (cleaned > 0) {
        console.log(`WorkspaceMemberCache: Cleaned up ${cleaned} stale entries`);
      }
    }, interval);
  }

  /**
   * Stop automatic cleanup
   */
  stopCleanupInterval() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Create singleton instance
const workspaceMemberCache = new WorkspaceMemberCache();

// Start automatic cleanup
workspaceMemberCache.startCleanupInterval();

export default workspaceMemberCache;