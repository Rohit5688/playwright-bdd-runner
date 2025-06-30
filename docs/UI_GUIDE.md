# 🎨 Complete UI Guide - BDD Test Runner v0.4.0

## 📦 Installation & Setup

### Install the Extension:
```bash
code --install-extension playwright-bdd-lens-0.4.0.vsix
```

## 🎯 Where to Find the New UI Features

### 1. **BDD Test Explorer** (Main UI Hub)
**Location**: VSCode Test Panel → "BDD Test Explorer" section

**How to Access**:
1. Open VSCode
2. Go to **View** → **Test** (or press `Ctrl+Shift+T`)
3. Look for **"BDD Test Explorer"** section
4. If not visible, open a workspace with `.feature` files

**Features Available**:
```
🧪 BDD Test Explorer
├── 📁 Feature Files (hierarchical tree)
├── 🎯 Toolbar Actions:
│   ├── ▶️ Run Selected Tests  
│   ├── 🐛 Debug Selected Tests
│   ├── 🏷️ Filter by Tag
│   ├── 📊 Filter by Status  
│   ├── 🧹 Clear Filters
│   ├── 📈 Show Results & Analytics
│   ├── 🔄 Refresh Tests
│   └── ⚙️ Settings (NEW!)
└── 📋 Context Menus (right-click on items)
```

### 2. **Settings UI** (Visual Configuration)
**Location**: BDD Test Explorer → ⚙️ Settings Button

**How to Access**:
1. Open **BDD Test Explorer** (as above)
2. Click the **⚙️ Settings** button in the toolbar
3. **Alternative**: `Ctrl+Shift+P` → "BDD Test Runner: Settings"

**Features**:
```
🛠️ Visual Settings Interface
├── 🔧 Core Configuration
│   ├── Playwright Config Path [Browse...]
│   ├── TypeScript Config Path [Browse...]  
│   ├── Features Folder [Browse...]
│   └── Steps Folder [Browse...]
├── ▶️ Test Execution
│   ├── Default Tags Filter
│   ├── Enable Feature Generation ☑️
│   ├── Test Command Template
│   └── Feature Generation Command
├── 🔍 Discovery & Automation
│   ├── Auto-Discover Configuration ☑️
│   └── Steps File Pattern
├── 🔗 CI/CD Integration
│   ├── GitHub Token
│   └── Auto-Trigger Workflows ☑️
└── 🎨 User Interface
    ├── Show Tag Filters ☑️
    ├── Show Status Filters ☑️
    ├── Show Execution History ☑️
    └── Auto-Refresh Interval (seconds)
```

### 3. **Analytics Dashboard** 
**Location**: BDD Test Explorer → 📈 Show Results & Analytics

**How to Access**:
1. Click **📈 Show Results & Analytics** in BDD Test Explorer toolbar
2. Opens interactive webview with charts and statistics

### 4. **Command Palette Integration**
**Location**: `Ctrl+Shift+P` → Search for "BDD"

**Available Commands**:
```
🎛️ Command Palette Options:
├── "BDD Test Runner: Settings" → Opens Settings UI
├── "BDD Test Runner: Show Results & Analytics" → Opens Dashboard  
├── "BDD Test Runner: Refresh Tests" → Refreshes test discovery
├── "BDD Test Runner: Auto-Discover Config" → Runs smart discovery
├── "BDD Test Runner: Validate Configuration" → Checks config
├── "BDD Test Runner: Search Tests" → Advanced test search
├── "BDD Test Runner: Show Step Definitions" → Lists all steps
├── "BDD Test Runner: Create Step Definition" → Step wizard
└── "BDD Test Runner: Show Execution History" → Test history
```

## 🎮 How to Use Each UI Feature

### **1. Visual Settings Configuration**
```
Step 1: Click ⚙️ Settings in BDD Test Explorer
Step 2: Navigate between setting groups (Core, Execution, etc.)
Step 3: Modify settings using:
   - Text inputs (for paths, commands)
   - Checkboxes (for boolean options)  
   - Browse buttons (for file/folder selection)
   - Number inputs (for intervals)
Step 4: Settings auto-save as you type!
Step 5: Use action buttons:
   - 💾 Save All Settings
   - 🔄 Reset to Defaults  
   - 📋 Export Settings (as JSON)
   - 📁 Import Settings (from JSON)
   - ✅ Validate Configuration
```

### **2. Enhanced Test Explorer**
```
📁 Hierarchical Test View:
├── Feature Name
│   ├── Scenario 1 [▶️🐛]
│   ├── Scenario 2 [▶️🐛]
│   └── Scenario Outline
│       ├── Example 1 [▶️🐛]
│       └── Example 2 [▶️🐛]

🎯 Toolbar Actions:
- Select tests → Run/Debug buttons appear
- Filter by tags (@smoke, @regression)
- Filter by status (passed/failed/pending)
- View analytics and results
- Access settings

📋 Context Menus:
- Right-click on features/scenarios
- Inline run/debug buttons
- Quick actions menu
```

### **3. Smart Auto-Discovery**
```
🔍 Auto-Discovery Process:
1. Scans entire workspace for configs
2. Analyzes file contents for Playwright patterns  
3. Discovers feature/step folders
4. Validates and applies settings
5. Shows results in Output panel

Trigger Methods:
- Automatic on extension startup
- Manual: Command Palette → "Auto-Discover Config"
- Settings UI → "Validate Configuration"
```

## 📍 UI Location Quick Reference

| Feature | Primary Location | Alternative Access |
|---------|-----------------|-------------------|
| **Settings UI** | BDD Explorer → ⚙️ | `Ctrl+Shift+P` → "Settings" |
| **Test Explorer** | Test Panel → BDD Explorer | View → Test |  
| **Analytics** | BDD Explorer → 📈 | Command Palette |
| **Filters** | BDD Explorer Toolbar | 🏷️🔍 buttons |
| **Auto-Discovery** | Automatic + Manual | Command Palette |
| **Step Management** | Command Palette | "Show Step Definitions" |

## 🚀 Getting Started Checklist

### **First Time Setup**:
1. ✅ Install extension: `code --install-extension playwright-bdd-lens-0.4.0.vsix`
2. ✅ Open workspace with `.feature` files
3. ✅ Check Test Panel → "BDD Test Explorer" appears
4. ✅ Click ⚙️ Settings to configure
5. ✅ Run auto-discovery: Command Palette → "Auto-Discover Config"
6. ✅ Refresh tests: 🔄 button in toolbar

### **Daily Usage**:
1. 🧪 View tests in BDD Test Explorer
2. 🎯 Use filters to find specific tests
3. ▶️ Run/debug with toolbar buttons
4. 📈 View results and analytics  
5. ⚙️ Adjust settings as needed

## 🆘 Troubleshooting

### **If BDD Test Explorer doesn't appear**:
1. Ensure workspace contains `.feature` files
2. Refresh: `Ctrl+Shift+P` → "Reload Window"
3. Check: View → Test panel is open

### **If Settings UI doesn't open**:
1. Try Command Palette → "BDD Test Runner: Settings"
2. Check extension is installed and enabled
3. Restart VSCode

### **If Auto-Discovery fails**:
1. Check Output panel: "Playwright BDD" channel
2. Manually configure in Settings UI
3. Validate paths exist in workspace

## 🎉 You're Ready!

The complete visual configuration system is now available in your VSCode! The extension transforms from command-line only to a full visual testing platform.
