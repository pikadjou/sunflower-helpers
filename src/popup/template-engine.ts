/**
 * Simple template engine for crop timers
 * Supports {{variable}} substitution and {{#condition}}{{/condition}} blocks
 */

export interface TemplateData {
  [key: string]: any;
}

export class TemplateEngine {
  private static templateCache: Map<string, string> = new Map();

  /**
   * Load and cache a template
   */
  static async loadTemplate(templateName: string): Promise<string> {
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName)!;
    }

    try {
      const templateUrl = chrome.runtime.getURL(`src/templates/${templateName}.html`);
      const response = await fetch(templateUrl);
      const template = await response.text();
      this.templateCache.set(templateName, template);
      return template;
    } catch (error) {
      return '';
    }
  }

  /**
   * Render a template with data
   */
  static render(template: string, data: TemplateData): string {
    let result = template;

    // Handle conditional blocks {{#condition}}content{{/condition}}
    result = result.replace(/\{\{#(\w+)\}\}(.*?)\{\{\/\1\}\}/gs, (_match, condition, content) => {
      return data[condition] ? content : '';
    });

    // Handle variable substitution {{variable}}
    result = result.replace(/\{\{(\w+)\}\}/g, (_match, variable) => {
      return data[variable] !== undefined ? String(data[variable]) : '';
    });

    return result;
  }

  /**
   * Render a template by name with data
   */
  static async renderTemplate(templateName: string, data: TemplateData): Promise<string> {
    const template = await this.loadTemplate(templateName);
    return this.render(template, data);
  }

  /**
   * Create DOM element from template
   */
  static createElementFromTemplate(template: string, data: TemplateData): HTMLElement {
    const rendered = this.render(template, data);
    const wrapper = document.createElement('div');
    wrapper.innerHTML = rendered.trim();
    return wrapper.firstElementChild as HTMLElement;
  }

  /**
   * Clear template cache
   */
  static clearCache(): void {
    this.templateCache.clear();
  }
}