# Dashboard Statistics Logic Explained

This document explains the logic behind the fileUtils.js and dashboard statistics calculations.

## 📁 **fileUtils.js - File Handling Utilities**

### **1. File Extension Extraction**
```javascript
getFileExtension("document.PDF") → "pdf"
```
**Logic**: 
- Splits filename by "." and takes last part
- Converts to lowercase for consistency
- Used for validation, icons, and path generation

### **2. File Size Formatting**
```javascript
formatFileSize(2048576) → "2 MB"
formatFileSize(1536) → "1.5 KB"
```
**Algorithm**:
```javascript
// Uses binary base (1024) for accurate file sizes
const k = 1024;
const sizes = ['Bytes', 'KB', 'MB', 'GB'];
const i = Math.floor(Math.log(bytes) / Math.log(k));
return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
```

### **3. File Type Icons**
```javascript
getFileIcon("report.pdf") → "PictureAsPdf"
getFileIcon("photo.jpg") → "Image"
```
**Mapping**:
- PDF files → Red PDF icon
- DOC/DOCX → Blue document icon  
- JPG/PNG → Green image icon
- Others → Generic attachment icon

### **4. File Validation**
```javascript
validateFile(file) → { isValid: boolean, error: string }
```
**Validation Rules**:
- **Size**: Maximum 10MB (10 * 1024 * 1024 bytes)
- **Types**: Only JPG, JPEG, PNG, PDF, DOC, DOCX
- **Existence**: File must be selected

### **5. Storage Path Generation**
```javascript
generateFilePath("ws123", "task456", "user789", "report.pdf")
→ "ws123/task456/user789_1640995200000.pdf"
```
**Structure**: `workspaceId/taskId/userId_timestamp.extension`
- **Hierarchy**: Enables workspace-based access control
- **Timestamp**: Prevents filename conflicts
- **User ID**: Tracks file ownership

---

## 📊 **Dashboard Statistics Logic**

### **🎯 Core Statistics Architecture**

#### **Caching System**
```javascript
// 15-minute cache to reduce database load
this.cache = new Map();
this.cacheTimeout = 15 * 60 * 1000;
```

#### **Parallel Data Fetching**
```javascript
// Fetches all statistics simultaneously for performance
const [taskMetrics, efficiencyMetrics, workspaceStats, achievements] = 
  await Promise.all([...]);
```

---

### **📈 Task Completion Metrics**

#### **Time Period Filtering**
```javascript
// Current week: Sunday to today
const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));

// Current month: 1st of month to today  
const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
```

#### **Completion Rate Calculation**
```javascript
const completionRate = total > 0 ? 
  Math.round((completed / total) * 100) : 0;
```

#### **Status Distribution**
```javascript
const byStatus = {
  todo: tasks.filter(t => t.status === 'todo').length,
  inProgress: tasks.filter(t => t.status === 'in_progress').length,
  submitted: tasks.filter(t => t.status === 'submitted').length,
  completed: tasks.filter(t => t.status === 'completed').length,
  needsRevision: tasks.filter(t => t.status === 'needs_revision').length
};
```

---

### **⚡ Efficiency Metrics**

#### **1. Average Completion Time**
```javascript
// Calculate time from task creation to completion (in hours)
const completionTimes = tasks.map(task => {
  const created = new Date(task.created_at);
  const completed = new Date(task.completed_at);
  return (completed - created) / (1000 * 60 * 60); // Convert to hours
});

const avgCompletionTime = completionTimes.reduce((sum, time) => 
  sum + time, 0) / completionTimes.length;
```

#### **2. On-Time Completion Rate**
```javascript
// Assumes 7 days (168 hours) is expected completion time
const onTimeCompletions = tasks.filter(task => {
  const timeTaken = (completed - created) / (1000 * 60 * 60 * 24); // days
  return timeTaken <= 7; // 7 days or less
}).length;

const onTimeRate = Math.round((onTimeCompletions / tasks.length) * 100);
```

#### **3. Revision Rate (Quality Metric)**
```javascript
// Tasks that needed revisions vs total submitted
const needsRevision = allUserTasks.filter(t => 
  t.status === 'needs_revision' || t.review_comments
).length;

const revisionRate = totalSubmitted > 0 ? 
  Math.round((needsRevision / totalSubmitted) * 100) : 0;
```

#### **4. Productivity Score Algorithm**
```javascript
calculateProductivityScore({ completionRate, avgCompletionTime, onTimeRate, revisionRate }) {
  // Weighted scoring system (totals 100%)
  const completionWeight = 0.3;  // 30% - How many tasks completed
  const speedWeight = 0.25;      // 25% - How fast tasks are completed  
  const timelinessWeight = 0.25; // 25% - Meeting deadlines
  const qualityWeight = 0.2;     // 20% - Quality (low revision rate)

  // Speed score: Lower completion time = higher score
  const speedScore = Math.max(0, 100 - (avgCompletionTime / 168) * 100);
  
  // Quality score: Lower revision rate = higher score
  const qualityScore = Math.max(0, 100 - revisionRate);

  // Weighted final score
  const score = (
    completionRate * completionWeight +      // 30%
    speedScore * speedWeight +               // 25%
    onTimeRate * timelinessWeight +          // 25%
    qualityScore * qualityWeight             // 20%
  );

  return Math.round(Math.min(100, Math.max(0, score)));
}
```

**Example Calculation**:
```javascript
// User with good performance:
completionRate: 80%    → 80 * 0.3 = 24 points
speedScore: 90%        → 90 * 0.25 = 22.5 points  
onTimeRate: 85%        → 85 * 0.25 = 21.25 points
qualityScore: 95%      → 95 * 0.2 = 19 points
// Total: 86.75 → 87/100 (Good performance)
```

---

### **🏢 Workspace Statistics**

#### **Workspace Categorization**
```javascript
// Owned workspaces: User is the creator/team leader
const ownedWorkspaces = await supabase
  .from('workspaces')
  .select('*')
  .eq('created_by', userId);

// Member workspaces: User joined as team member  
const memberWorkspaces = await supabase
  .from('workspace_members')
  .select('workspace_id, workspaces(*)')
  .eq('user_id', userId);
```

#### **Most Active Workspace Detection**
```javascript
// Count tasks per workspace
const workspaceTaskCounts = {};
taskDistribution.forEach(task => {
  const wsId = task.workspace_id;
  if (!workspaceTaskCounts[wsId]) {
    workspaceTaskCounts[wsId] = {
      id: wsId,
      name: task.workspaces?.name,
      taskCount: 0,
      completedCount: 0
    };
  }
  workspaceTaskCounts[wsId].taskCount++;
  if (task.status === 'completed') {
    workspaceTaskCounts[wsId].completedCount++;
  }
});

// Find workspace with most tasks
const mostActive = Object.values(workspaceTaskCounts)
  .sort((a, b) => b.taskCount - a.taskCount)[0];
```

---

### **🏆 Achievement System**

#### **Badge Calculation**
```javascript
// Completion milestones
if (completedTasks >= 10) badges.push('Getting Started');
if (completedTasks >= 50) badges.push('Half Century'); 
if (completedTasks >= 100) badges.push('Task Master');

// Quality badges
const revisionRate = (revisionTasks / allTasks.length) * 100;
if (revisionRate < 10 && completedTasks >= 20) {
  badges.push('Quality Master');
}
```

#### **Streak Calculation**
```javascript
// Daily completion streaks
let currentStreak = 0;
let longestStreak = 0;

// Check consecutive days with completed tasks
for (const task of recentTasks) {
  const taskDate = new Date(task.completed_at).toDateString();
  if (taskDate === today || isRecentDay(taskDate, 7)) {
    currentStreak++;
  } else {
    break; // Streak broken
  }
}
```

---

### **📱 Recent Activity Generation**

#### **Activity Types**
```javascript
// Weekly completion activity
if (thisWeek.completed > 0) {
  activities.push({
    type: 'completion',
    title: `Completed ${thisWeek.completed} tasks this week`,
    color: '#4caf50'
  });
}

// High productivity month
if (thisMonth.completionRate > 75) {
  activities.push({
    type: 'achievement', 
    title: `${thisMonth.completionRate}% completion rate this month`,
    color: '#ff9800'
  });
}
```

---

## 🎯 **Key Performance Insights**

### **What Each Metric Tells Us**

1. **Completion Rate**: Overall productivity and task finishing ability
2. **Average Completion Time**: Work speed and efficiency  
3. **On-Time Rate**: Meeting deadlines and time management
4. **Revision Rate**: Work quality and attention to detail
5. **Productivity Score**: Holistic performance combining all factors
6. **Streaks**: Consistency and daily work habits
7. **Workspace Activity**: Collaboration patterns and engagement

### **How Scores Are Interpreted**

- **90-100**: Excellent performance
- **75-89**: Good performance  
- **60-74**: Average performance
- **40-59**: Below average, needs improvement
- **0-39**: Poor performance, requires attention

This comprehensive system provides users with actionable insights into their productivity patterns and areas for improvement!