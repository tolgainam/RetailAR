#!/usr/bin/env python3
"""
Create simple colored rectangles as sample reference images
Uses only built-in libraries
"""

import os

def create_simple_svg(width, height, background_color, text, text_color, filename):
    """Create a simple SVG image with text"""
    svg_content = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="{width}" height="{height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="{width}" height="{height}" fill="{background_color}"/>
  <text x="{width//2}" y="{height//2}" font-family="Arial" font-size="24" font-weight="bold" 
        text-anchor="middle" dominant-baseline="middle" fill="{text_color}">{text}</text>
</svg>'''
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    
    with open(filename, 'w') as f:
        f.write(svg_content)
    
    print(f"Created: {filename}")

def create_product_images():
    """Create sample SVG images for all demo products"""
    
    # TEREA Yellow
    base_path = "assets/products/terea-yellow/reference-images/"
    create_simple_svg(512, 512, "#FFD700", "TEREA YELLOW", "#8B4513", f"{base_path}front.svg")
    create_simple_svg(512, 300, "#FFD700", "TEREA Y", "#8B4513", f"{base_path}side.svg")
    create_simple_svg(400, 400, "#FFD700", "TEREA", "#8B4513", f"{base_path}angle_45.svg")
    create_simple_svg(200, 200, "#FFD700", "IQOS", "#8B4513", f"{base_path}logo.svg")
    create_simple_svg(512, 200, "#FFD700", "TEREA", "#8B4513", f"{base_path}top.svg")
    
    # TEREA Sienna
    base_path = "assets/products/terea-sienna/reference-images/"
    create_simple_svg(512, 512, "#8B4513", "TEREA SIENNA", "#FFFFFF", f"{base_path}front.svg")
    create_simple_svg(512, 300, "#8B4513", "TEREA S", "#FFFFFF", f"{base_path}side.svg")
    create_simple_svg(400, 400, "#8B4513", "TEREA", "#FFFFFF", f"{base_path}angle_45.svg")
    create_simple_svg(200, 200, "#8B4513", "IQOS", "#FFFFFF", f"{base_path}logo.svg")
    create_simple_svg(512, 200, "#8B4513", "TEREA", "#FFFFFF", f"{base_path}top.svg")
    
    # ZYN Cool Mint
    base_path = "assets/products/zyn-can-1/reference-images/"
    create_simple_svg(512, 512, "#00BFFF", "ZYN COOL MINT", "#FFFFFF", f"{base_path}front.svg")
    create_simple_svg(300, 512, "#00BFFF", "ZYN MINT", "#FFFFFF", f"{base_path}side.svg")
    create_simple_svg(512, 512, "#00BFFF", "ZYN", "#FFFFFF", f"{base_path}top.svg")
    create_simple_svg(400, 400, "#00BFFF", "ZYN COOL", "#FFFFFF", f"{base_path}angle_30.svg")
    create_simple_svg(200, 200, "#00BFFF", "ZYN", "#FFFFFF", f"{base_path}logo.svg")
    
    # ZYN Citrus
    base_path = "assets/products/zyn-can-2/reference-images/"
    create_simple_svg(512, 512, "#FFA500", "ZYN CITRUS", "#FFFFFF", f"{base_path}front.svg")
    create_simple_svg(300, 512, "#FFA500", "ZYN CITRUS", "#FFFFFF", f"{base_path}side.svg")
    create_simple_svg(512, 512, "#FFA500", "ZYN", "#FFFFFF", f"{base_path}top.svg")
    create_simple_svg(400, 400, "#FFA500", "ZYN CITRUS", "#FFFFFF", f"{base_path}angle_30.svg")
    create_simple_svg(200, 200, "#FFA500", "ZYN", "#FFFFFF", f"{base_path}logo.svg")

if __name__ == "__main__":
    print("Creating sample reference images (SVG format)...")
    create_product_images()
    print("✅ Sample images created successfully!")
    print("\nTo test the full version:")
    print("  1. Open: http://localhost:8080/")
    print("  2. Click 'Scan Products'") 
    print("  3. Point camera at yellow, brown, blue, or orange objects")