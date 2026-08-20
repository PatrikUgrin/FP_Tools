import { fpglobals } from "../fpglobals";
import { SpineController } from "../../spine/SpineController";
import { spine_player } from "../../spine/spine_player";
import { RenderTexture, Renderer, Texture } from "pixi.js";
import * as PIXI from "pixi.js";

// Performance monitoring devpanel functionality
export class performance_devpanel {
    private static devpanel_html: any;
    private static previewCache: Map<string, string> = new Map();
    private static parentHierarchyCache: Map<string, any[]> = new Map();
    
    public static init(devpanelDocument: any) {
        this.devpanel_html = devpanelDocument;
        this.bindPerformanceEvents();
    }
    
    private static bindPerformanceEvents() {
        // Bind refresh buttons
        const refreshBtn = this.devpanel_html.getElementById("refresh-spine-pools");
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshSpinePools();
            });
        }
        
        const refreshGpuBtn = this.devpanel_html.getElementById("refresh-gpu-textures");
        if (refreshGpuBtn) {
            refreshGpuBtn.addEventListener('click', () => {
                // Add loading state
                const originalText = refreshGpuBtn.textContent;
                refreshGpuBtn.textContent = '⏳ Refreshing...';
                refreshGpuBtn.disabled = true;
                
                // Use setTimeout to allow UI to update before processing
                setTimeout(() => {
                    this.updateWebGLTextures();
                    
                    // Restore button state
                    refreshGpuBtn.textContent = originalText;
                    refreshGpuBtn.disabled = false;
                }, 10);
            });
        }
    }
    
    public static refreshSpinePools() {
        if (!SpineController.symbol_pool || !SpineController.other_pool) {
            fpglobals.GLog("Performance DevPanel: Spine pools not initialized", 'WARNING');
            return;
        }
        
        // Clear preview cache to ensure fresh previews
        this.previewCache.clear();
        this.parentHierarchyCache.clear();
        
        this.updateSymbolSpinePool();
        this.updateOtherSpinePool();
        // Note: WebGL textures are now updated separately via the "Refresh GPU Textures" button
    }
    
    public static refreshGpuTextures() {
        this.updateWebGLTextures();
    }
    
    private static updateSymbolSpinePool() {
        const symbolList = this.devpanel_html.getElementById("symbol-spine-list");
        const totalSpan = this.devpanel_html.getElementById("symbol-total");
        const freeSpan = this.devpanel_html.getElementById("symbol-free");
        const busySpan = this.devpanel_html.getElementById("symbol-busy");
        
        if (!symbolList || !SpineController.symbol_pool) return;
        
        const allSpines = (SpineController.symbol_pool as any).all_spine;
        let freeCount = 0;
        let busyCount = 0;
        
        // Clear existing items
        symbolList.innerHTML = '';
        
        // Add spine items
        allSpines.forEach((spine: spine_player, index: number) => {
            const spineItem = document.createElement('div');
            spineItem.className = 'spine-item';
            
            const isFree = spine.isFree;
            const isUpdating = spine.parent != null;
            
            if (isFree) {
                spineItem.classList.add('free');
                freeCount++;
            } else {
                spineItem.classList.add('busy');
                busyCount++;
            }
            
            if (isUpdating) {
                spineItem.classList.add('updating');
            }
            
            // Capture parent hierarchy — key MUST match the click/hover lookup key below
            const hierarchyKey = `${spine.libsym}_${index}_symbol`;
            const parentHierarchy = this.captureParentHierarchy(spine);
            this.parentHierarchyCache.set(hierarchyKey, parentHierarchy);
            
            // Create texture preview
            const texturePreview = document.createElement('div');
            texturePreview.className = 'spine-texture-preview';
            
            // Try to generate texture preview from spine
            const texture = this.generateSpinePreview(spine);
            if (texture) {
                const img = document.createElement('img');
                img.src = texture;
                img.alt = spine.libsym || 'Unknown';
                img.onerror = () => {
                    // If image fails to load, show fallback
                    img.style.display = 'none';
                    const noTexture = document.createElement('div');
                    noTexture.className = 'no-texture';
                    noTexture.textContent = spine.libsym ? spine.libsym.charAt(0).toUpperCase() : '?';
                    texturePreview.appendChild(noTexture);
                };
                texturePreview.appendChild(img);
            } else {
                const noTexture = document.createElement('div');
                noTexture.className = 'no-texture';
                noTexture.textContent = spine.libsym ? spine.libsym.charAt(0).toUpperCase() : '?';
                texturePreview.appendChild(noTexture);
            }
            
            // Create content container
            const contentContainer = document.createElement('div');
            contentContainer.className = 'spine-item-content';
            
            // Create header with name and status
            const headerElement = document.createElement('div');
            headerElement.className = 'spine-item-header';
            
            const nameElement = document.createElement('span');
            nameElement.className = 'spine-name';
            nameElement.textContent = `${spine.libsym || 'Unknown'}`;
            
            const statusElement = document.createElement('span');
            statusElement.className = 'spine-status';
            
            let statusText = 'free';
            if (!isFree) {
                statusText = 'busy';
            }
            if (isUpdating) {
                statusText = 'updating';
            }
            
            statusElement.textContent = statusText;
            statusElement.classList.add(statusText);
            
            headerElement.appendChild(nameElement);
            headerElement.appendChild(statusElement);
            
            // Add additional info
            const infoElement = document.createElement('div');
            infoElement.style.fontSize = '10px';
            infoElement.style.color = '#aaa';
            const hierarchyCount = Math.max(0, parentHierarchy.length - 1); // parents only (self is first)
            const selfInfo = parentHierarchy.length > 0 ? parentHierarchy[0] : null;
            const worldVis = selfInfo ? (selfInfo.worldVisible ? 'Y' : 'N') : '?';
            infoElement.innerHTML = `
                [${index}] Parent:${spine.parent ? 'Y' : 'N'} Pool:${spine.spine_pool ? 'Y' : 'N'} Visible:${spine.visible ? 'Y' : 'N'} WorldVis:${worldVis} ${hierarchyCount > 0 ? `Parents:${hierarchyCount}` : ''}
            `;
            
            contentContainer.appendChild(headerElement);
            contentContainer.appendChild(infoElement);
            
            spineItem.appendChild(texturePreview);
            spineItem.appendChild(contentContainer);
            
            // Add event listeners for hierarchy display (same as Other pool)
            spineItem.addEventListener('mouseenter', () => {
                this.showHierarchyTooltip(spineItem, hierarchyKey);
            });
            spineItem.addEventListener('mouseleave', () => {
                this.hideHierarchyTooltip();
            });
            spineItem.addEventListener('click', () => {
                this.showHierarchyModal(hierarchyKey);
            });
            
            symbolList.appendChild(spineItem);
        });
        
        // Update stats
        if (totalSpan) totalSpan.textContent = allSpines.length.toString();
        if (freeSpan) freeSpan.textContent = freeCount.toString();
        if (busySpan) busySpan.textContent = busyCount.toString();
    }
    
    private static updateOtherSpinePool() {
        const otherList = this.devpanel_html.getElementById("other-spine-list");
        const totalSpan = this.devpanel_html.getElementById("other-total");
        const freeSpan = this.devpanel_html.getElementById("other-free");
        const busySpan = this.devpanel_html.getElementById("other-busy");
        
        if (!otherList || !SpineController.other_pool) return;
        
        const allSpines = (SpineController.other_pool as any).all_spine;
        let freeCount = 0;
        let busyCount = 0;
        
        // Clear existing items
        otherList.innerHTML = '';
        
        // Add spine items
        allSpines.forEach((spine: spine_player, index: number) => {
            const spineItem = document.createElement('div');
            spineItem.className = 'spine-item';
            
            const isFree = spine.isFree;
            const isUpdating = spine.parent != null;
            
            if (isFree) {
                spineItem.classList.add('free');
                freeCount++;
            } else {
                spineItem.classList.add('busy');
                busyCount++;
            }
            
            if (isUpdating) {
                spineItem.classList.add('updating');
            }
            
            // Capture parent hierarchy — key MUST match the click/hover lookup key below
            const hierarchyKey = `${spine.libsym}_${index}_other`;
            const parentHierarchy = this.captureParentHierarchy(spine);
            this.parentHierarchyCache.set(hierarchyKey, parentHierarchy);
            
            // Create texture preview
            const texturePreview = document.createElement('div');
            texturePreview.className = 'spine-texture-preview';
            
            // Try to generate texture preview from spine
            const texture = this.generateSpinePreview(spine);
            if (texture) {
                const img = document.createElement('img');
                img.src = texture;
                img.alt = spine.libsym || 'Unknown';
                img.onerror = () => {
                    // If image fails to load, show fallback
                    img.style.display = 'none';
                    const noTexture = document.createElement('div');
                    noTexture.className = 'no-texture';
                    noTexture.textContent = spine.libsym ? spine.libsym.charAt(0).toUpperCase() : '?';
                    texturePreview.appendChild(noTexture);
                };
                texturePreview.appendChild(img);
            } else {
                const noTexture = document.createElement('div');
                noTexture.className = 'no-texture';
                noTexture.textContent = spine.libsym ? spine.libsym.charAt(0).toUpperCase() : '?';
                texturePreview.appendChild(noTexture);
            }
            
            // Create content container
            const contentContainer = document.createElement('div');
            contentContainer.className = 'spine-item-content';
            
            // Create header with name and status
            const headerElement = document.createElement('div');
            headerElement.className = 'spine-item-header';
            
            const nameElement = document.createElement('span');
            nameElement.className = 'spine-name';
            nameElement.textContent = `${spine.libsym || 'Unknown'}`;
            
            const statusElement = document.createElement('span');
            statusElement.className = 'spine-status';
            
            let statusText = 'free';
            if (!isFree) {
                statusText = 'busy';
            }
            if (isUpdating) {
                statusText = 'updating';
            }
            
            statusElement.textContent = statusText;
            statusElement.classList.add(statusText);
            
            headerElement.appendChild(nameElement);
            headerElement.appendChild(statusElement);
            
            // Add additional info
            const infoElement = document.createElement('div');
            infoElement.style.fontSize = '10px';
            infoElement.style.color = '#aaa';
            const hierarchyCount = Math.max(0, parentHierarchy.length - 1); // parents only (self is first)
            const selfInfo = parentHierarchy.length > 0 ? parentHierarchy[0] : null;
            const worldVis = selfInfo ? (selfInfo.worldVisible ? 'Y' : 'N') : '?';
            infoElement.innerHTML = `
                [${index}] Parent:${spine.parent ? 'Y' : 'N'} Pool:${spine.spine_pool ? 'Y' : 'N'} Visible:${spine.visible ? 'Y' : 'N'} WorldVis:${worldVis} ${hierarchyCount > 0 ? `Parents:${hierarchyCount}` : ''}
            `;
            
            contentContainer.appendChild(headerElement);
            contentContainer.appendChild(infoElement);
            
            spineItem.appendChild(texturePreview);
            spineItem.appendChild(contentContainer);
            
            // Add event listeners for hierarchy display
            spineItem.addEventListener('mouseenter', () => {
                this.showHierarchyTooltip(spineItem, hierarchyKey);
            });
            spineItem.addEventListener('mouseleave', () => {
                this.hideHierarchyTooltip();
            });
            spineItem.addEventListener('click', () => {
                this.showHierarchyModal(hierarchyKey);
            });
            
            otherList.appendChild(spineItem);
        });
        
        // Update stats
        if (totalSpan) totalSpan.textContent = allSpines.length.toString();
        if (freeSpan) freeSpan.textContent = freeCount.toString();
        if (busySpan) busySpan.textContent = busyCount.toString();
    }
    
    private static updateWebGLTextures() {
        const textureList = this.devpanel_html.getElementById("texture-list");
        const totalSpan = this.devpanel_html.getElementById("texture-total");
        const gpuCountSpan = this.devpanel_html.getElementById("texture-gpu-count");
        const memorySpan = this.devpanel_html.getElementById("texture-memory");
        const gpuMemorySpan = this.devpanel_html.getElementById("texture-gpu-memory");
        
        if (!textureList || !fpglobals.GApp || !fpglobals.GApp.renderer) {
            return;
        }
        
        // Clear existing items
        textureList.innerHTML = '';
        
        const renderer = fpglobals.GApp.renderer as Renderer;
        let totalMemory = 0;
        let gpuMemory = 0;
        let textureCount = 0;
        let gpuTextureCount = 0;
        
        // Get WebGL context to access actual GPU textures
        const gl = (renderer as any).gl || (renderer as any).webGLRenderer?.gl;
        console.log('WebGL context:', gl);
        
        // Try to get textures from PIXI's internal texture management
        const gpuTextures: any[] = [];
        
        if (gl) {
            // Get WebGL texture info
            const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
            const maxCombinedTextureImageUnits = gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS);
            const maxTextureImageUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
            
            console.log('WebGL Info:');
            console.log('- Max texture size:', maxTextureSize);
            console.log('- Max combined texture image units:', maxCombinedTextureImageUnits);
            console.log('- Max texture image units:', maxTextureImageUnits);
            
            // Try to access PIXI's texture system
            const textureSystem = (renderer as any).texture;
            if (textureSystem) {
                console.log('PIXI Texture System:', textureSystem);
                
                // Try to get managed textures (textures uploaded to GPU)
                if (textureSystem.managedTextures) {
                    console.log('Managed textures (GPU uploaded):', textureSystem.managedTextures);
                    for (const texture of textureSystem.managedTextures) {
                        if (texture && texture.baseTexture) {
                            gpuTextures.push({
                                texture: texture,
                                baseTexture: texture.baseTexture,
                                isManaged: true
                            });
                        }
                    }
                }
                
                // Try to get bound textures
                if (textureSystem.boundTextures) {
                    console.log('Bound textures:', textureSystem.boundTextures);
                    for (let i = 0; i < textureSystem.boundTextures.length; i++) {
                        const boundTexture = textureSystem.boundTextures[i];
                        if (boundTexture && boundTexture !== 0) {
                            gpuTextures.push({
                                unit: i,
                                texture: boundTexture,
                                type: 'TEXTURE_2D',
                                isBound: true
                            });
                        }
                    }
                }
                
                // Try to get texture cache from texture system
                if (textureSystem.cache) {
                    console.log('Texture system cache:', textureSystem.cache);
                    for (const key in textureSystem.cache) {
                        if (Object.prototype.hasOwnProperty.call(textureSystem.cache, key)) {
                            const texture = textureSystem.cache[key];
                            if (texture && texture.baseTexture) {
                                // Check if texture has _glTextures (indicates GPU upload)
                                const hasGLTextures = (texture.baseTexture as any)._glTextures && 
                                    Object.keys((texture.baseTexture as any)._glTextures).length > 0;
                                
                                if (hasGLTextures) {
                                    gpuTextures.push({
                                        name: key,
                                        texture: texture,
                                        baseTexture: texture.baseTexture,
                                        glTextures: (texture.baseTexture as any)._glTextures,
                                        isUploaded: true
                                    });
                                }
                            }
                        }
                    }
                }
            }
            
            // Also try to get bound textures from WebGL context
            for (let i = 0; i < maxCombinedTextureImageUnits; i++) {
                gl.activeTexture(gl.TEXTURE0 + i);
                const boundTexture = gl.getParameter(gl.TEXTURE_BINDING_2D);
                if (boundTexture && boundTexture !== 0) {
                    gpuTextures.push({
                        unit: i,
                        texture: boundTexture,
                        type: 'TEXTURE_2D',
                        isCurrentlyBound: true
                    });
                }
            }
        }
        
        // Also get PIXI texture cache for reference
        let textureCache: any = {};
        
        // Try multiple ways to access texture cache
        if ((PIXI as any).utils && (PIXI as any).utils.TextureCache) {
            textureCache = (PIXI as any).utils.TextureCache;
        }
        else if ((Texture as any).cache) {
            textureCache = (Texture as any).cache;
        }
        else if ((renderer as any).texture && (renderer as any).texture.cache) {
            textureCache = (renderer as any).texture.cache;
        }
        
        console.log('PIXI Texture cache found:', textureCache);
        console.log('GPU textures found:', gpuTextures);
        
        // Get all textures from the cache and deduplicate by baseTexture
        const textures: any[] = [];
        const seenBaseTextures = new Set();
        
        if (textureCache && typeof textureCache === 'object') {
            for (const key in textureCache) {
                if (Object.prototype.hasOwnProperty.call(textureCache, key)) {
                    const texture = textureCache[key];
                    if (texture && texture.baseTexture) {
                        // Skip if we've already processed this baseTexture
                        if (seenBaseTextures.has(texture.baseTexture)) {
                            continue;
                        }
                        seenBaseTextures.add(texture.baseTexture);
                        
                        // GPU pixels: realWidth/Height already include BaseTexture.resolution
                        const actualWidth = texture.baseTexture.realWidth || texture.baseTexture.width || 0;
                        const actualHeight = texture.baseTexture.realHeight || texture.baseTexture.height || 0;
                        
                        // Skip textures with invalid dimensions
                        if (actualWidth <= 0 || actualHeight <= 0) {
                            continue;
                        }
                        
                        // Check if this texture is uploaded to GPU
                        const hasGLTextures = (texture.baseTexture as any)._glTextures && 
                            Object.keys((texture.baseTexture as any)._glTextures).length > 0;
                        
                        // Check if this texture is in managed textures (uploaded to GPU)
                        const isManaged = gpuTextures.some(gpuTex => 
                            gpuTex.isManaged && gpuTex.baseTexture === texture.baseTexture
                        );
                        
                        // Check if this texture is currently bound
                        const isCurrentlyBound = gpuTextures.some(gpuTex => 
                            gpuTex.isCurrentlyBound && gpuTex.texture && 
                            (texture.baseTexture as any)._glTextures && 
                            Object.values((texture.baseTexture as any)._glTextures).includes(gpuTex.texture)
                        );
                        
                        const isUploadedToGPU = hasGLTextures || isManaged;
                        
                        // Find the best name for this texture (prefer shorter, cleaner names)
                        const allNames = [];
                        for (const cacheKey in textureCache) {
                            if (textureCache[cacheKey] && textureCache[cacheKey].baseTexture === texture.baseTexture) {
                                allNames.push(cacheKey);
                            }
                        }
                        
                        // Choose the best name (prefer shorter names, avoid paths with ./)
                        const bestName = allNames.reduce((best, current) => {
                            if (current.startsWith('./')) return best;
                            if (best.startsWith('./')) return current;
                            return current.length < best.length ? current : best;
                        });
                        
                        textures.push({
                            name: bestName,
                            allNames: allNames,
                            texture: texture,
                            baseTexture: texture.baseTexture,
                            actualWidth: actualWidth,
                            actualHeight: actualHeight,
                            isBoundToGPU: isUploadedToGPU,
                            isCurrentlyBound: isCurrentlyBound,
                            hasGLTextures: hasGLTextures,
                            isManaged: isManaged,
                            gpuTexture: isUploadedToGPU ? {
                                glTextures: (texture.baseTexture as any)._glTextures,
                                isManaged: isManaged,
                                isCurrentlyBound: isCurrentlyBound
                            } : null
                        });
                    }
                }
            }
        }
        
        // Sort textures: GPU uploaded first, then by GPU memory usage (highest first)
        textures.sort((a, b) => {
            // First priority: GPU uploaded textures come first
            if (a.isBoundToGPU && !b.isBoundToGPU) return -1;
            if (!a.isBoundToGPU && b.isBoundToGPU) return 1;
            
            // If both are GPU uploaded or both are not, sort by memory usage (highest first)
            if (a.isBoundToGPU && b.isBoundToGPU) {
                const aMemory = a.actualWidth * a.actualHeight * 4;
                const bMemory = b.actualWidth * b.actualHeight * 4;
                return bMemory - aMemory; // Highest memory first
            }
            
            // If neither are GPU uploaded, sort by memory usage (highest first)
            const aMemory = a.actualWidth * a.actualHeight * 4;
            const bMemory = b.actualWidth * b.actualHeight * 4;
            return bMemory - aMemory; // Highest memory first
        });
        
        // Add header to explain sorting
        if (textures.length > 0) {
            const headerItem = document.createElement('div');
            headerItem.className = 'texture-item';
            headerItem.style.background = 'rgba(0, 0, 0, 0.3)';
            headerItem.style.border = '1px solid rgba(255, 255, 255, 0.3)';
            headerItem.style.fontWeight = 'bold';
            headerItem.style.textAlign = 'center';
            headerItem.style.marginBottom = '8px';
            headerItem.innerHTML = `
                <div style="color: #4CAF50;">📊 Sorted by GPU Memory Usage</div>
                <div style="font-size: 10px; color: #aaa; margin-top: 2px;">
                    GPU textures first (ranked by memory), then cache-only textures<br>
                    Duplicates removed • Actual dimensions shown
                </div>
            `;
            textureList.appendChild(headerItem);
        }
        
        // Create texture items
        textures.forEach((textureData, index) => {
            const textureItem = document.createElement('div');
            textureItem.className = 'texture-item';
            
            // Add GPU-uploaded class for styling
            if (textureData.isBoundToGPU) {
                textureItem.classList.add('gpu-uploaded');
            }
            
            const { name, allNames, texture, baseTexture, actualWidth, actualHeight, isBoundToGPU, isCurrentlyBound, hasGLTextures, isManaged, gpuTexture } = textureData;
            
            // Calculate memory usage using actual dimensions
            const memorySize = (actualWidth * actualHeight * 4) / (1024 * 1024); // Assuming RGBA format
            totalMemory += memorySize;
            textureCount++;
            
            // Track GPU memory usage
            if (isBoundToGPU) {
                gpuMemory += memorySize;
                gpuTextureCount++;
            }
            
            // Create texture name element with rank indicator
            const nameElement = document.createElement('div');
            nameElement.className = 'texture-name';
            
            // Add rank number for GPU textures
            const rankPrefix = isBoundToGPU ? `#${index + 1} ` : '';
            nameElement.textContent = rankPrefix + name;
            
            // Add duplicate names info if there are multiple names for the same texture
            if (allNames.length > 1) {
                const duplicateInfo = document.createElement('div');
                duplicateInfo.className = 'texture-info';
                duplicateInfo.style.color = '#ffb74d';
                duplicateInfo.style.fontSize = '10px';
                duplicateInfo.innerHTML = `Also known as: ${allNames.slice(1).join(', ')}`;
                textureItem.appendChild(duplicateInfo);
            }
            
            // Create texture info element with enhanced GPU status
            let gpuStatus = '';
            if (isBoundToGPU) {
                if (isCurrentlyBound) {
                    gpuStatus = `<span style="color: #4CAF50;">GPU: ACTIVE</span>`;
                } else if (hasGLTextures) {
                    gpuStatus = `<span style="color: #81C784;">GPU: UPLOADED</span>`;
                } else if (isManaged) {
                    gpuStatus = `<span style="color: #81C784;">GPU: MANAGED</span>`;
                } else {
                    gpuStatus = `<span style="color: #4CAF50;">GPU: YES</span>`;
                }
            } else {
                gpuStatus = `<span style="color: #ff9800;">GPU: NO</span>`;
            }
            
            const infoElement = document.createElement('div');
            infoElement.className = 'texture-info';
            
            // Add memory usage bar for visual indication
            const memoryBarWidth = Math.min((memorySize / 10) * 100, 100); // Scale to 10MB max for bar
            const memoryBar = isBoundToGPU ? 
                `<div style="display: inline-block; width: ${memoryBarWidth}px; height: 3px; background: linear-gradient(90deg, #4CAF50, #81C784); border-radius: 2px; margin-left: 5px; vertical-align: middle;"></div>` : 
                `<div style="display: inline-block; width: ${memoryBarWidth}px; height: 3px; background: linear-gradient(90deg, #ff9800, #ffb74d); border-radius: 2px; margin-left: 5px; vertical-align: middle;"></div>`;
            
            infoElement.innerHTML = `
                Size: <span class="texture-size">${actualWidth}x${actualHeight}</span> | 
                Memory: <span class="texture-size">${memorySize.toFixed(2)} MB</span>${memoryBar} | 
                ${gpuStatus} | 
                Format: <span class="texture-format">${baseTexture.format || 'Unknown'}</span>
            `;
            
            // Add additional GPU info if available
            if (gpuTexture && gpuTexture.glTextures) {
                const gpuInfo = document.createElement('div');
                gpuInfo.className = 'texture-info';
                gpuInfo.style.color = '#4CAF50';
                gpuInfo.style.fontSize = '10px';
                
                const glTextureKeys = Object.keys(gpuTexture.glTextures);
                gpuInfo.innerHTML = `
                    GL Textures: ${glTextureKeys.length} | 
                    Managed: ${gpuTexture.isManaged ? 'YES' : 'NO'} | 
                    Currently Bound: ${gpuTexture.isCurrentlyBound ? 'YES' : 'NO'}
                `;
                textureItem.appendChild(gpuInfo);
            }
            
            textureItem.appendChild(nameElement);
            textureItem.appendChild(infoElement);
            
            // Add click handler to show texture details
            textureItem.addEventListener('click', () => {
                this.showTextureDetails(name, texture, baseTexture, gpuTexture);
            });
            
            textureList.appendChild(textureItem);
        });
        
        // If still no textures, show a message
        if (textures.length === 0) {
            const noTexturesItem = document.createElement('div');
            noTexturesItem.className = 'texture-item';
            noTexturesItem.style.color = '#ff9800';
            noTexturesItem.innerHTML = `
                <div class="texture-name">No textures found</div>
                <div class="texture-info">WebGL context: ${gl ? 'Available' : 'Not available'}</div>
            `;
            textureList.appendChild(noTexturesItem);
        }
        
        // Update stats
        if (totalSpan) totalSpan.textContent = textureCount.toString();
        if (gpuCountSpan) gpuCountSpan.textContent = gpuTextureCount.toString();
        if (memorySpan) memorySpan.textContent = totalMemory.toFixed(2);
        if (gpuMemorySpan) gpuMemorySpan.textContent = gpuMemory.toFixed(2);
    }
    
    // Method to show texture details modal
    private static showTextureDetails(name: string, texture: any, baseTexture: any, gpuTexture?: any) {
        // Remove existing modal if any
        const existingModal = document.getElementById('texture-details-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        const modal = document.createElement('div');
        modal.id = 'texture-details-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 10001;
            display: flex;
            justify-content: center;
            align-items: center;
        `;
        
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: #2a2a2a;
            color: white;
            padding: 20px;
            border-radius: 10px;
            max-width: 80%;
            max-height: 80%;
            overflow-y: auto;
            border: 2px solid #4CAF50;
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.5);
        `;
        
        const width = baseTexture.width || 0;
        const height = baseTexture.height || 0;
        const memorySize = (width * height * 4) / (1024 * 1024);
        
        let modalHTML = '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">';
        modalHTML += '<h3 style="margin: 0; color: #4CAF50;">Texture Details</h3>';
        modalHTML += '<button id="close-texture-modal" style="background: #ff4444; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">Close</button>';
        modalHTML += '</div>';
        
        modalHTML += '<div style="font-family: monospace; font-size: 14px;">';
        modalHTML += `<div style="margin: 10px 0;"><strong>Name:</strong> ${name}</div>`;
        modalHTML += `<div style="margin: 10px 0;"><strong>Dimensions:</strong> ${width} x ${height}</div>`;
        modalHTML += `<div style="margin: 10px 0;"><strong>Memory Usage:</strong> <span style="color: #4CAF50;">${memorySize.toFixed(2)} MB</span></div>`;
        modalHTML += `<div style="margin: 10px 0;"><strong>Format:</strong> <span style="color: #81C784;">${baseTexture.format || 'Unknown'}</span></div>`;
        modalHTML += `<div style="margin: 10px 0;"><strong>Type:</strong> <span style="color: #81C784;">${baseTexture.type || 'Unknown'}</span></div>`;
        modalHTML += `<div style="margin: 10px 0;"><strong>Scale Mode:</strong> ${baseTexture.scaleMode || 'Unknown'}</div>`;
        modalHTML += `<div style="margin: 10px 0;"><strong>Resolution:</strong> ${baseTexture.resolution || 'Unknown'}</div>`;
        modalHTML += `<div style="margin: 10px 0;"><strong>Valid:</strong> <span style="color: ${baseTexture.valid ? '#4CAF50' : '#ff4444'}">${baseTexture.valid ? 'Yes' : 'No'}</span></div>`;
        modalHTML += `<div style="margin: 10px 0;"><strong>Destroyed:</strong> <span style="color: ${baseTexture.destroyed ? '#ff4444' : '#4CAF50'}">${baseTexture.destroyed ? 'Yes' : 'No'}</span></div>`;
        
        if (baseTexture.resource) {
            modalHTML += `<div style="margin: 10px 0;"><strong>Resource URL:</strong> ${baseTexture.resource.url || 'N/A'}</div>`;
        }
        
        // Add GPU texture information
        if (gpuTexture) {
            modalHTML += '<div style="margin: 20px 0; padding: 10px; background: rgba(76, 175, 80, 0.1); border-radius: 5px;">';
            modalHTML += '<h4 style="margin: 0 0 10px 0; color: #4CAF50;">GPU Texture Information</h4>';
            
            if (gpuTexture.glTextures) {
                const glTextureKeys = Object.keys(gpuTexture.glTextures);
                modalHTML += `<div style="margin: 5px 0;"><strong>GL Textures:</strong> ${glTextureKeys.length} texture(s)</div>`;
                glTextureKeys.forEach(key => {
                    modalHTML += `<div style="margin: 5px 0; margin-left: 20px;"><strong>${key}:</strong> ${gpuTexture.glTextures[key]}</div>`;
                });
            }
            
            if (gpuTexture.unit !== undefined) {
                modalHTML += `<div style="margin: 5px 0;"><strong>GPU Unit:</strong> ${gpuTexture.unit}</div>`;
            }
            
            if (gpuTexture.type) {
                modalHTML += `<div style="margin: 5px 0;"><strong>Texture Type:</strong> ${gpuTexture.type}</div>`;
            }
            
            if (gpuTexture.texture) {
                modalHTML += `<div style="margin: 5px 0;"><strong>GPU Texture ID:</strong> ${gpuTexture.texture}</div>`;
            }
            
            if (gpuTexture.isManaged !== undefined) {
                modalHTML += `<div style="margin: 5px 0;"><strong>Managed by PIXI:</strong> <span style="color: ${gpuTexture.isManaged ? '#4CAF50' : '#ff9800'}">${gpuTexture.isManaged ? 'YES' : 'NO'}</span></div>`;
            }
            
            if (gpuTexture.isCurrentlyBound !== undefined) {
                modalHTML += `<div style="margin: 5px 0;"><strong>Currently Bound:</strong> <span style="color: ${gpuTexture.isCurrentlyBound ? '#4CAF50' : '#ff9800'}">${gpuTexture.isCurrentlyBound ? 'YES' : 'NO'}</span></div>`;
            }
            
            modalHTML += '</div>';
        } else {
            modalHTML += '<div style="margin: 20px 0; padding: 10px; background: rgba(255, 152, 0, 0.1); border-radius: 5px;">';
            modalHTML += '<h4 style="margin: 0 0 10px 0; color: #ff9800;">GPU Status</h4>';
            modalHTML += '<div style="margin: 5px 0; color: #ff9800;">Not uploaded to GPU memory</div>';
            modalHTML += '<div style="margin: 5px 0; color: #aaa; font-size: 12px;">This texture exists only in PIXI cache and has not been uploaded to GPU memory yet.</div>';
            modalHTML += '</div>';
        }
        
        modalHTML += '</div>';
        
        modalContent.innerHTML = modalHTML;
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Add close button functionality
        const closeBtn = document.getElementById('close-texture-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.remove();
            });
        }
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    // Capture display-object info used by hierarchy tooltip/modal
    private static captureDisplayObjectInfo(obj: any, isSelf: boolean = false): any {
        let worldPos = { x: obj.x || 0, y: obj.y || 0 };
        try {
            if (typeof obj.getGlobalPosition === 'function') {
                const gp = obj.getGlobalPosition();
                worldPos = { x: gp.x, y: gp.y };
            }
        } catch (_e) { /* ignore */ }
        
        // Reel/symbol parents often expose a grid pos
        const gridPos = (obj as any).pos
            ? { x: (obj as any).pos.x, y: (obj as any).pos.y }
            : null;
        
        return {
            isSelf,
            name: obj.name || (isSelf ? (obj.libsym || 'Spine') : 'Unnamed'),
            type: obj.constructor?.name || 'Unknown',
            libsym: obj.libsym || null,
            resourceName: obj.resourceName || null,
            visible: !!obj.visible,
            worldVisible: obj.worldVisible !== undefined ? !!obj.worldVisible : !!obj.visible,
            renderable: obj.renderable !== undefined ? !!obj.renderable : true,
            alpha: obj.alpha ?? 1,
            worldAlpha: obj.worldAlpha ?? obj.alpha ?? 1,
            scale: { x: obj.scale?.x || 1, y: obj.scale?.y || 1 },
            position: { x: obj.x || 0, y: obj.y || 0 },
            worldPosition: worldPos,
            gridPos,
            children: obj.children ? obj.children.length : 0,
            zIndex: obj.zIndex ?? 0
        };
    }
    
    // Method to capture spine + parent hierarchy (self first, then parents toward stage root)
    private static captureParentHierarchy(spine: spine_player): any[] {
        const hierarchy: any[] = [];
        
        // Include the spine itself so we can see why it may be invisible while updating
        hierarchy.push(this.captureDisplayObjectInfo(spine, true));
        
        let current = spine.parent;
        while (current) {
            hierarchy.push(this.captureDisplayObjectInfo(current, false));
            current = current.parent;
        }
        
        return hierarchy;
    }
    
    // Method to generate texture preview from spine object using renderer
    private static generateSpinePreview(spine: spine_player): string | null {
        try {
            const spineName = spine.libsym || 'unknown';
            const cacheKey = `${spineName}_${spine.constructor.name}`;
            
            // Check cache first
            if (this.previewCache.has(cacheKey)) {
                return this.previewCache.get(cacheKey) || null;
            }
            
            if (!fpglobals.GApp || !fpglobals.GApp.renderer) {
                return null;
            }
            
            const renderer = fpglobals.GApp.renderer as Renderer;
            
            // Get spine bounds
            const bounds = spine.getLocalBounds();
            if (bounds.width === 0 || bounds.height === 0) {
                // Try to set a default animation if spine is not visible
                if (spine.skeleton && spine.skeleton.data && spine.skeleton.data.animations.length > 0) {
                    try {
                        spine.state.setAnimation(0, spine.skeleton.data.animations[0].name, false);
                        spine.state.update(0.1);
                        spine.state.apply(spine.skeleton);
                        spine.skeleton.updateWorldTransform();
                        
                        // Try bounds again
                        const newBounds = spine.getLocalBounds();
                        if (newBounds.width === 0 || newBounds.height === 0) {
                            return null;
                        }
                    } catch (animError) {
                        console.warn('Error setting spine animation for preview:', animError);
                        return null;
                    }
                } else {
                    return null;
                }
            }
            
            // Create render texture with some padding
            const padding = 10;
            const renderTexture = RenderTexture.create({
                width: bounds.width + padding * 2,
                height: bounds.height + padding * 2
            });
            
            // Save original position and scale
            const originalX = spine.x;
            const originalY = spine.y;
            const originalScaleX = spine.scale.x;
            const originalScaleY = spine.scale.y;
            
            // Position spine for rendering (center it in the render texture)
            spine.x = padding;
            spine.y = padding;
            
            // Render the spine to texture
            renderer.render(spine, { renderTexture });
            
            // Restore original position and scale
            spine.x = originalX;
            spine.y = originalY;
            spine.scale.x = originalScaleX;
            spine.scale.y = originalScaleY;
            
            // Convert render texture to base64 data URL
            const canvas = renderer.extract.canvas(renderTexture);
            const dataURL = canvas.toDataURL('image/png');
            
            // Clean up render texture
            renderTexture.destroy();
            
            // Cache the result
            this.previewCache.set(cacheKey, dataURL);
            
            return dataURL;
            
        } catch (error) {
            console.warn('Error generating spine preview:', error);
            return null;
        }
    }
    
    // Method to show hierarchy tooltip on hover
    private static showHierarchyTooltip(element: HTMLElement, hierarchyKey: string) {
        const hierarchy = this.parentHierarchyCache.get(hierarchyKey);
        if (!hierarchy || hierarchy.length === 0) return;
        
        const tooltip = document.createElement('div');
        tooltip.id = 'hierarchy-tooltip';
        tooltip.style.cssText = `
            position: fixed;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 10px;
            border-radius: 5px;
            font-family: monospace;
            font-size: 12px;
            z-index: 10000;
            max-width: 360px;
            border: 1px solid #4CAF50;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        `;
        
        let tooltipContent = '<div style="font-weight: bold; margin-bottom: 5px; color: #4CAF50;">Scene Hierarchy (self → root):</div>';
        hierarchy.forEach((node, index) => {
            const indent = '  '.repeat(index);
            const label = node.isSelf ? '●' : '├─';
            const nameColor = node.isSelf ? '#FFD54F' : '#fff';
            tooltipContent += `<div>${indent}${label} <span style="color:${nameColor}">${node.name}</span> (${node.type})</div>`;
            tooltipContent += `<div style="margin-left: ${(index + 1) * 16}px; color: #ccc; font-size: 10px;">`;
            tooltipContent += `Vis:${node.visible ? 'Y' : 'N'} WVis:${node.worldVisible ? 'Y' : 'N'} α:${(node.alpha ?? 1).toFixed(2)} `;
            tooltipContent += `World:(${node.worldPosition.x.toFixed(0)},${node.worldPosition.y.toFixed(0)})`;
            if (node.gridPos) {
                tooltipContent += ` Grid:[${node.gridPos.x},${node.gridPos.y}]`;
            }
            tooltipContent += `</div>`;
        });
        
        tooltip.innerHTML = tooltipContent;
        document.body.appendChild(tooltip);
        
        // Position tooltip near mouse
        const rect = element.getBoundingClientRect();
        tooltip.style.left = (rect.right + 10) + 'px';
        tooltip.style.top = rect.top + 'px';
    }
    
    // Method to hide hierarchy tooltip
    private static hideHierarchyTooltip() {
        const tooltip = document.getElementById('hierarchy-tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    }
    
    // Method to show hierarchy modal on click
    private static showHierarchyModal(hierarchyKey: string) {
        const hierarchy = this.parentHierarchyCache.get(hierarchyKey);
        if (!hierarchy) return;
        
        // Remove existing modal if any
        const existingModal = document.getElementById('hierarchy-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        const modal = document.createElement('div');
        modal.id = 'hierarchy-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 10001;
            display: flex;
            justify-content: center;
            align-items: center;
        `;
        
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: #2a2a2a;
            color: white;
            padding: 20px;
            border-radius: 10px;
            max-width: 80%;
            max-height: 80%;
            overflow-y: auto;
            border: 2px solid #4CAF50;
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.5);
        `;
        
        let modalHTML = '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">';
        modalHTML += '<h3 style="margin: 0; color: #4CAF50;">Spine Object Hierarchy Tree</h3>';
        modalHTML += '<button id="close-hierarchy-modal" style="background: #ff4444; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">Close</button>';
        modalHTML += '</div>';
        
        const hasParent = hierarchy.some((n: any) => !n.isSelf);
        if (!hasParent) {
            modalHTML += '<div style="color: #ccc; font-style: italic; margin-bottom: 12px;">No parent — spine is not attached to the scene graph.</div>';
        }
        
        modalHTML += '<div style="font-family: monospace; font-size: 14px;">';
        hierarchy.forEach((node, index) => {
            const indent = '&nbsp;&nbsp;'.repeat(index);
            const bullet = node.isSelf ? '●' : '├─';
            const nameColor = node.isSelf ? '#FFD54F' : '#fff';
            const role = node.isSelf ? ' <span style="color:#FFD54F;font-size:11px;">(spine)</span>' : '';
            modalHTML += `<div style="margin: 5px 0;">${indent}${bullet} <strong style="color:${nameColor}">${node.name}</strong>${role} (<span style="color: #4CAF50;">${node.type}</span>)</div>`;
            modalHTML += `<div style="margin-left: ${(index + 1) * 20}px; color: #ccc; font-size: 12px; margin-bottom: 10px;">`;
            if (node.libsym) {
                modalHTML += `libsym: <span style="color:#81C784">${node.libsym}</span> | `;
            }
            if (node.resourceName) {
                modalHTML += `resource: <span style="color:#81C784">${node.resourceName}</span> | `;
            }
            modalHTML += `Visible: <span style="color: ${node.visible ? '#4CAF50' : '#ff4444'}">${node.visible ? 'Yes' : 'No'}</span> | `;
            modalHTML += `WorldVisible: <span style="color: ${node.worldVisible ? '#4CAF50' : '#ff4444'}">${node.worldVisible ? 'Yes' : 'No'}</span> | `;
            modalHTML += `Renderable: <span style="color: ${node.renderable ? '#4CAF50' : '#ff4444'}">${node.renderable ? 'Yes' : 'No'}</span><br>`;
            modalHTML += `Alpha: ${(node.alpha ?? 1).toFixed(2)} | WorldAlpha: ${(node.worldAlpha ?? 1).toFixed(2)} | `;
            modalHTML += `Scale: (${(node.scale?.x ?? 1).toFixed(2)}, ${(node.scale?.y ?? 1).toFixed(2)}) | `;
            modalHTML += `Local: (${(node.position?.x ?? 0).toFixed(1)}, ${(node.position?.y ?? 0).toFixed(1)}) | `;
            modalHTML += `World: (${(node.worldPosition?.x ?? 0).toFixed(1)}, ${(node.worldPosition?.y ?? 0).toFixed(1)})`;
            if (node.gridPos) {
                modalHTML += ` | Grid: [${node.gridPos.x}, ${node.gridPos.y}]`;
            }
            modalHTML += ` | zIndex: ${node.zIndex ?? 0} | Children: ${node.children}</div>`;
        });
        modalHTML += '</div>';
        
        modalContent.innerHTML = modalHTML;
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Add close button functionality
        const closeBtn = document.getElementById('close-hierarchy-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.remove();
            });
        }
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    // Method to get spine pool statistics for external use
    public static getSpinePoolStats() {
        if (!SpineController.symbol_pool || !SpineController.other_pool) {
            return null;
        }
        
        const symbolSpines = (SpineController.symbol_pool as any).all_spine;
        const otherSpines = (SpineController.other_pool as any).all_spine;
        
        const symbolStats = {
            total: symbolSpines.length,
            free: symbolSpines.filter((s: spine_player) => s.isFree).length,
            busy: symbolSpines.filter((s: spine_player) => !s.isFree).length,
            updating: symbolSpines.filter((s: spine_player) => s.parent != null).length
        };
        
        const otherStats = {
            total: otherSpines.length,
            free: otherSpines.filter((s: spine_player) => s.isFree).length,
            busy: otherSpines.filter((s: spine_player) => !s.isFree).length,
            updating: otherSpines.filter((s: spine_player) => s.parent != null).length
        };
        
        return {
            symbol: symbolStats,
            other: otherStats,
            total: {
                total: symbolStats.total + otherStats.total,
                free: symbolStats.free + otherStats.free,
                busy: symbolStats.busy + otherStats.busy,
                updating: symbolStats.updating + otherStats.updating
            }
        };
    }
}
