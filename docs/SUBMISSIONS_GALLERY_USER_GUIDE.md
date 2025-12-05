# Submissions Gallery User Guide

## Overview

The Submissions Gallery provides a centralized, visual interface for viewing and managing all task submissions within a workspace. Located in the WorkspaceDashboard, it offers comprehensive access to submitted files with advanced filtering, search, and management capabilities.

## Accessing the Gallery

### Navigation
1. **From Dashboard**: Go to WorkspaceDashboard page
2. **Locate Section**: Scroll to "Workspace Submissions" section
3. **Gallery View**: All submissions displayed in grid format

### Gallery Layout
- **Grid Display**: Visual grid of submission cards
- **File Previews**: Thumbnail previews for supported file types
- **Metadata Display**: Submitter, task, date, and status information
- **Action Buttons**: Quick access to view, download, and manage files

## Gallery Features

### 1. Submission Display

#### Card Layout
```jsx
const SubmissionCard = ({ submission }) => (
  <div className="submission-card">
    <div className="file-preview">
      <FilePreview 
        fileType={submission.fileType}
        fileUrl={submission.previewUrl}
        fileName={submission.fileName}
      />
    </div>
    
    <div className="submission-info">
      <h4 className="task-title">{submission.taskTitle}</h4>
      <p className="submitter">By: {submission.submitterName}</p>
      <p className="submission-date">
        {formatDate(submission.submittedAt)}
      </p>
      <StatusBadge status={submission.status} />
    </div>
    
    <div className="submission-actions">
      <button onClick={() => viewSubmission(submission.id)}>
        View
      </button>
      <button onClick={() => downloadSubmission(submission.id)}>
        Download
      </button>
      <DropdownMenu>
        <MenuItem onClick={() => showDetails(submission.id)}>
          Details
        </MenuItem>
        <MenuItem onClick={() => showHistory(submission.id)}>
          History
        </MenuItem>
      </DropdownMenu>
    </div>
  </div>
);
```

#### Information Display
- **Task Title**: Name of the task the submission belongs to
- **Submitter Name**: Who uploaded the file
- **Submission Date**: When the file was submitted
- **File Type**: Visual icon indicating file format
- **File Size**: Size of the submitted file
- **Status Badge**: Current review status with color coding

### 2. File Type Support

#### Viewable in Browser
```javascript
const VIEWABLE_TYPES = {
  images: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'],
  documents: ['pdf'],
  text: ['txt', 'md', 'rtf'],
  code: ['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json', 'xml'],
  video: ['mp4', 'webm', 'ogg'] // Limited support
};
```

#### Preview Generation
```javascript
// File preview system
const generatePreview = async (file) => {
  const fileType = getFileType(file.name);
  
  switch (fileType.category) {
    case 'image':
      return await generateImagePreview(file);
    case 'document':
      return await generateDocumentPreview(file);
    case 'text':
      return await generateTextPreview(file);
    default:
      return getDefaultIcon(fileType.extension);
  }
};
```

#### Download-Only Files
- **Office Documents**: DOC, DOCX, XLS, XLSX, PPT, PPTX
- **Archives**: ZIP, RAR, 7Z, TAR
- **Media**: Large video files, audio files
- **Specialized**: CAD files, database files, proprietary formats

### 3. Search and Filtering

#### Search Functionality
```jsx
const SearchAndFilter = ({ onSearch, onFilter }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    fileType: 'all',
    submitter: 'all',
    dateRange: 'all'
  });
  
  return (
    <div className="search-filter-bar">
      <div className="search-section">
        <SearchInput
          placeholder="Search by task title, submitter, or file name..."
          value={searchTerm}
          onChange={setSearchTerm}
          onSearch={() => onSearch(searchTerm)}
        />
      </div>
      
      <div className="filter-section">
        <FilterDropdown
          label="Status"
          value={filters.status}
          options={STATUS_OPTIONS}
          onChange={(status) => setFilters({...filters, status})}
        />
        <FilterDropdown
          label="File Type"
          value={filters.fileType}
          options={FILE_TYPE_OPTIONS}
          onChange={(fileType) => setFilters({...filters, fileType})}
        />
        <FilterDropdown
          label="Submitter"
          value={filters.submitter}
          options={SUBMITTER_OPTIONS}
          onChange={(submitter) => setFilters({...filters, submitter})}
        />
        <DateRangeFilter
          value={filters.dateRange}
          onChange={(dateRange) => setFilters({...filters, dateRange})}
        />
      </div>
      
      <button onClick={() => onFilter(filters)} className="apply-filters">
        Apply Filters
      </button>
    </div>
  );
};
```

#### Advanced Filtering Options
- **By Status**: Filter by review status (Under Review, Completed, etc.)
- **By File Type**: Filter by file format categories
- **By Submitter**: Filter by specific team members
- **By Date Range**: Filter by submission date ranges
- **By Task**: Filter by specific tasks or task categories

### 4. Sorting Options

#### Available Sort Methods
```javascript
const SORT_OPTIONS = [
  { value: 'date_desc', label: 'Newest First' },
  { value: 'date_asc', label: 'Oldest First' },
  { value: 'submitter_asc', label: 'Submitter A-Z' },
  { value: 'submitter_desc', label: 'Submitter Z-A' },
  { value: 'task_asc', label: 'Task A-Z' },
  { value: 'task_desc', label: 'Task Z-A' },
  { value: 'size_desc', label: 'Largest Files' },
  { value: 'size_asc', label: 'Smallest Files' },
  { value: 'status', label: 'By Status' }
];
```

#### Custom Sorting
```jsx
const SortControls = ({ currentSort, onSortChange }) => (
  <div className="sort-controls">
    <label>Sort by:</label>
    <select value={currentSort} onChange={(e) => onSortChange(e.target.value)}>
      {SORT_OPTIONS.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);
```

## File Operations

### 1. Viewing Files

#### In-Browser Preview
```javascript
// File viewing system
const viewFile = async (submissionId) => {
  const submission = await getSubmission(submissionId);
  
  if (isViewableInBrowser(submission.fileType)) {
    // Open in modal viewer
    openFileViewer({
      url: submission.fileUrl,
      type: submission.fileType,
      name: submission.fileName
    });
  } else {
    // Prompt for download
    promptDownload(submission);
  }
};
```

#### Modal File Viewer
```jsx
const FileViewerModal = ({ file, onClose }) => {
  const renderContent = () => {
    switch (file.type.category) {
      case 'image':
        return <ImageViewer src={file.url} alt={file.name} />;
      case 'pdf':
        return <PDFViewer src={file.url} />;
      case 'text':
        return <TextViewer src={file.url} />;
      case 'code':
        return <CodeViewer src={file.url} language={file.type.language} />;
      default:
        return <UnsupportedFileMessage file={file} />;
    }
  };
  
  return (
    <div className="file-viewer-modal">
      <div className="modal-header">
        <h3>{file.name}</h3>
        <button onClick={onClose}>×</button>
      </div>
      <div className="modal-content">
        {renderContent()}
      </div>
      <div className="modal-actions">
        <button onClick={() => downloadFile(file)}>
          Download
        </button>
        <button onClick={() => shareFile(file)}>
          Share
        </button>
      </div>
    </div>
  );
};
```

### 2. Downloading Files

#### Single File Download
```javascript
// Secure file download
const downloadFile = async (submissionId) => {
  try {
    // Verify download permissions
    const canDownload = await verifyDownloadPermission(submissionId);
    if (!canDownload) {
      throw new Error('Permission denied');
    }
    
    // Get secure download URL
    const downloadUrl = await getSecureDownloadUrl(submissionId);
    
    // Log download activity
    await logDownloadActivity(submissionId);
    
    // Trigger download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = submission.fileName;
    link.click();
    
  } catch (error) {
    showError('Download failed: ' + error.message);
  }
};
```

#### Bulk Download
```javascript
// Multiple file download
const downloadMultipleFiles = async (submissionIds) => {
  try {
    // Create download package
    const packageId = await createDownloadPackage(submissionIds);
    
    // Generate ZIP file
    const zipUrl = await generateZipFile(packageId);
    
    // Download ZIP
    downloadFile(zipUrl, `submissions_${Date.now()}.zip`);
    
  } catch (error) {
    showError('Bulk download failed: ' + error.message);
  }
};
```

### 3. File Management

#### Submission Details
```jsx
const SubmissionDetailsModal = ({ submissionId, onClose }) => {
  const [submission, setSubmission] = useState(null);
  const [reviews, setReviews] = useState([]);
  
  useEffect(() => {
    loadSubmissionDetails(submissionId).then(setSubmission);
    loadSubmissionReviews(submissionId).then(setReviews);
  }, [submissionId]);
  
  return (
    <div className="submission-details-modal">
      <div className="details-header">
        <h2>Submission Details</h2>
        <button onClick={onClose}>×</button>
      </div>
      
      <div className="details-content">
        <section className="basic-info">
          <h3>Basic Information</h3>
          <InfoRow label="Task" value={submission?.taskTitle} />
          <InfoRow label="Submitter" value={submission?.submitterName} />
          <InfoRow label="Submitted" value={formatDate(submission?.submittedAt)} />
          <InfoRow label="File Size" value={formatFileSize(submission?.fileSize)} />
          <InfoRow label="File Type" value={submission?.fileType} />
          <InfoRow label="Status" value={<StatusBadge status={submission?.status} />} />
        </section>
        
        <section className="file-info">
          <h3>File Information</h3>
          <FilePreview file={submission} />
          <div className="file-actions">
            <button onClick={() => viewFile(submission.id)}>View</button>
            <button onClick={() => downloadFile(submission.id)}>Download</button>
          </div>
        </section>
        
        <section className="review-history">
          <h3>Review History</h3>
          <ReviewTimeline reviews={reviews} />
        </section>
      </div>
    </div>
  );
};
```

## Real-Time Updates

### 1. Live Synchronization

#### WebSocket Integration
```javascript
// Real-time updates system
const useSubmissionUpdates = (workspaceId) => {
  const [submissions, setSubmissions] = useState([]);
  
  useEffect(() => {
    const ws = new WebSocket(`ws://api/workspaces/${workspaceId}/submissions`);
    
    ws.onmessage = (event) => {
      const update = JSON.parse(event.data);
      
      switch (update.type) {
        case 'submission_added':
          setSubmissions(prev => [update.submission, ...prev]);
          break;
        case 'submission_updated':
          setSubmissions(prev => 
            prev.map(sub => 
              sub.id === update.submission.id ? update.submission : sub
            )
          );
          break;
        case 'submission_deleted':
          setSubmissions(prev => 
            prev.filter(sub => sub.id !== update.submissionId)
          );
          break;
      }
    };
    
    return () => ws.close();
  }, [workspaceId]);
  
  return submissions;
};
```

#### Update Notifications
```jsx
const UpdateNotification = ({ update, onDismiss }) => (
  <div className="update-notification">
    <div className="notification-content">
      <Icon type={update.type} />
      <span>{update.message}</span>
    </div>
    <button onClick={onDismiss}>×</button>
  </div>
);
```

### 2. Status Synchronization

#### Automatic Refresh
```javascript
// Status synchronization
const syncSubmissionStatuses = async (submissions) => {
  const statusUpdates = await getStatusUpdates(
    submissions.map(s => s.id)
  );
  
  return submissions.map(submission => {
    const update = statusUpdates.find(u => u.id === submission.id);
    return update ? { ...submission, ...update } : submission;
  });
};
```

## Security and Privacy

### 1. Access Control

#### Permission System
```javascript
// Gallery access permissions
const checkGalleryAccess = async (userId, workspaceId) => {
  // Must be workspace member
  const isMember = await isWorkspaceMember(userId, workspaceId);
  if (!isMember) {
    return { hasAccess: false, reason: 'Not a workspace member' };
  }
  
  // Check specific permissions
  const permissions = await getUserPermissions(userId, workspaceId);
  if (!permissions.canViewSubmissions) {
    return { hasAccess: false, reason: 'Insufficient permissions' };
  }
  
  return { hasAccess: true };
};
```

#### File Access Security
```javascript
// Secure file access
const getSecureFileUrl = async (submissionId, userId) => {
  // Verify access permissions
  await verifyFileAccess(submissionId, userId);
  
  // Generate time-limited URL
  const secureUrl = await generateSecureUrl(submissionId, {
    expiresIn: '1h',
    userId: userId,
    permissions: ['view', 'download']
  });
  
  return secureUrl;
};
```

### 2. Data Protection

#### Privacy Controls
- **Member-Only Access**: Only workspace members can view submissions
- **Submission Privacy**: Submitters can mark files as private
- **Download Logging**: All file access is logged for audit
- **Secure URLs**: Time-limited, signed URLs for file access

#### Compliance Features
```javascript
// GDPR compliance features
const handleDataRequest = async (userId, requestType) => {
  switch (requestType) {
    case 'export':
      return await exportUserSubmissions(userId);
    case 'delete':
      return await deleteUserSubmissions(userId);
    case 'anonymize':
      return await anonymizeUserSubmissions(userId);
  }
};
```

## Performance Optimization

### 1. Lazy Loading

#### Progressive Loading
```jsx
const SubmissionsGallery = ({ workspaceId }) => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  const loadMoreSubmissions = useCallback(async () => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    try {
      const newSubmissions = await fetchSubmissions({
        workspaceId,
        offset: submissions.length,
        limit: 20
      });
      
      setSubmissions(prev => [...prev, ...newSubmissions]);
      setHasMore(newSubmissions.length === 20);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, submissions.length, loading, hasMore]);
  
  return (
    <InfiniteScroll
      dataLength={submissions.length}
      next={loadMoreSubmissions}
      hasMore={hasMore}
      loader={<LoadingSpinner />}
    >
      <SubmissionGrid submissions={submissions} />
    </InfiniteScroll>
  );
};
```

### 2. Caching Strategy

#### Client-Side Caching
```javascript
// Submission caching
const useSubmissionCache = () => {
  const cache = useRef(new Map());
  
  const getCachedSubmission = (id) => {
    return cache.current.get(id);
  };
  
  const setCachedSubmission = (id, submission) => {
    cache.current.set(id, {
      ...submission,
      cachedAt: Date.now()
    });
  };
  
  const isCacheValid = (cachedSubmission) => {
    const maxAge = 5 * 60 * 1000; // 5 minutes
    return Date.now() - cachedSubmission.cachedAt < maxAge;
  };
  
  return { getCachedSubmission, setCachedSubmission, isCacheValid };
};
```

## Troubleshooting

### Common Issues

#### Gallery Not Loading
- **Check Permissions**: Verify workspace membership
- **Network Issues**: Check internet connection
- **Browser Cache**: Clear cache and refresh
- **JavaScript Errors**: Check browser console for errors

#### Files Not Displaying
- **File Format**: Verify file type is supported
- **File Size**: Check if file exceeds display limits
- **Permissions**: Verify file access permissions
- **Storage Issues**: Check if files are accessible

#### Download Problems
- **Browser Settings**: Check download permissions
- **File Size**: Large files may timeout
- **Network**: Check connection stability
- **Security**: Verify file hasn't been quarantined

### Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Access Denied" | Insufficient permissions | Contact workspace admin |
| "File Not Found" | File may be deleted | Refresh page, contact support |
| "Download Failed" | Network or server issue | Try again, check connection |
| "Preview Unavailable" | Unsupported file type | Download file to view |

---

*Document Version: 1.0*
*Last Updated: October 2024*
*Maintained by: Development Team*