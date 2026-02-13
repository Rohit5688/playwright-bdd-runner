# 🔧 Troubleshooting Guide - BDD Test Runner Configuration UI

## 🎯 Where to Find the Configuration UI

### ❌ **NOT in VSCode Settings**
The Configuration UI is **NOT** in VSCode's standard settings (`File > Preferences > Settings`). It's a custom visual interface built specifically for this extension.

### ✅ **Correct Locations to Access Configuration UI**

#### **Method 1: BDD Test Explorer (Primary)**
```
1. Open VSCode
2. Go to Test Panel: View → Test (or Ctrl+Shift+T)
3. Look for "BDD Test Explorer" section
4. Click the ⚙️ Settings button in the toolbar
```

#### **Method 2: Command Palette (Alternative)**
```
1. Press Ctrl+Shift+P (Cmd+Shift+P on Mac)
2. Type: "BDD Test Runner: Settings" 
3. Press Enter
```

#### **Method 3: Context Menu**
```
1. Right-click in the BDD Test Explorer
2. Look for "Settings" option
```

## 🚨 Common Issues & Solutions

### **Issue 1: "BDD Test Explorer" Not Visible**

#### **Possible Causes:**
- Extension not installed properly
- No `.feature` files in workspace
- Extension not activated

#### **Solutions:**
```bash
# Check extension is installed
code --list-extensions | grep playwright-bdd

# Install if missing
code --install-extension playwright-bdd-lens-0.4.0.vsix

# Reload VSCode
Ctrl+Shift+P → "Developer: Reload Window"
```

### **Issue 2: Settings Button (⚙️) Not Visible**

#### **Check the toolbar in BDD Test Explorer:**
```
Expected toolbar buttons:
├── ▶️ Run Selected Tests
├── 🐛 Debug Selected Tests  
├── 🏷️ Filter by Tag
├── 📊 Filter by Status
├── 🧹 Clear Filters
├── 📈 Show Results & Analytics
├── 🔄 Refresh Tests
└── ⚙️ Settings ← This should be here!
```

#### **If Settings button missing:**
```bash
# Try command palette instead
Ctrl+Shift+P → "BDD Test Runner: Settings"

# Check extension activation
Ctrl+Shift+P → "Extensions: Show Running Extensions"
# Look for "BDD Test Runner" in the list
```

### **Issue 3: Extension Not Activating**

#### **Activation Requirements:**
The extension activates when:
- `.feature` files exist in workspace
- Specific commands are run
- Workspace is opened

#### **Manual Activation:**
```bash
# Force activation via command
Ctrl+Shift+P → "BDD Test Runner: Refresh Tests"

# Or create a test .feature file
# Create: test.feature with content:
Feature: Test
  Scenario: Test scenario
    Given I have a test
```

### **Issue 4: Command Not Found**

#### **If "BDD Test Runner: Settings" not in Command Palette:**

1. **Check Extension Status:**
```
Ctrl+Shift+P → "Extensions: Show Running Extensions"
Look for "BDD Test Runner" or "playwright-bdd-lens"
```

2. **Reinstall Extension:**
```bash
# Uninstall first
code --uninstall-extension rohitsakhawalkar.playwright-bdd-lens

# Reinstall
code --install-extension playwright-bdd-lens-0.4.0.vsix

# Reload
Ctrl+Shift+P → "Developer: Reload Window"
```

## 🔍 Debug Steps

### **Step 1: Verify Installation**
```bash
# Check if extension is installed
code --list-extensions | grep playwright-bdd

# Expected output:
# rohitsakhawalkar.playwright-bdd-lens
```

### **Step 2: Check Test Panel**
```
1. Open Test Panel: View → Test
2. Look for sections:
   - "BDD Test Explorer" ← Custom section
   - Standard VSCode test controllers
```

### **Step 3: Check Extension Logs**
```
1. Go to: View → Output
2. Select "Playwright BDD" from dropdown
3. Look for activation messages
```

### **Step 4: Check Workspace**
```
Requirements for extension activation:
- Workspace folder must be open
- Extension should detect .feature files OR
- Manual activation via command palette
```

## 🎯 Alternative Access Methods

### **If UI Still Not Accessible:**

#### **Method A: Force Activation**
```
Ctrl+Shift+P → "BDD Test Runner: Auto-Discover Config"
This should activate the extension and make settings available
```

#### **Method B: Create Test Files**
```
1. Create a .feature file in your workspace:
   File: test.feature
   Content:
   Feature: Test Feature
     Scenario: Test
       Given I test something

2. Refresh: Ctrl+Shift+P → "BDD Test Runner: Refresh Tests"
```

#### **Method C: Check Extension Details**
```
1. Go to Extensions panel (Ctrl+Shift+X)
2. Search for "BDD Test Runner"
3. Click on extension
4. Check if "Settings" or commands are listed
```

## 📞 Still Not Working?

### **Fallback Options:**

1. **Use VSCode's Standard Settings:**
```
File → Preferences → Settings
Search for: "playwright"
Configure basic settings manually
```

2. **Direct Configuration File:**
```
Edit .vscode/settings.json:
{
  "playwrightBdd.configPath": "./playwright.config.ts",
  "playwrightBdd.featureFolder": "features",
  "playwrightBdd.stepsFolder": "steps"
}
```

3. **Check Extension Console:**
```
Ctrl+Shift+P → "Developer: Toggle Developer Tools"
Console tab → Look for errors
```

## 🎉 Success Indicators

### **You'll know it's working when:**
- ✅ "BDD Test Explorer" appears in Test panel
- ✅ Settings button (⚙️) visible in toolbar
- ✅ Command "BDD Test Runner: Settings" in palette
- ✅ Settings UI opens as webview with visual interface

### **Expected Settings UI:**
```
Visual interface with tabs:
├── 🔧 Core Configuration
├── ▶️ Test Execution  
├── 🔍 Discovery & Automation
├── 🔗 CI/CD Integration
└── 🎨 User Interface

NOT the standard VSCode settings page!
