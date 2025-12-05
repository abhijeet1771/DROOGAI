/**
 * Breaking change detection
 * Detects API changes that break existing code
 */

import { CodeSymbol, CallRelationship } from '../parser/types.js';
import { CodebaseIndexer } from '../indexer/indexer.js';

export interface BreakingChange {
  symbol: CodeSymbol;
  changeType: 'signature' | 'removed' | 'visibility' | 'return_type';
  oldSignature?: string;
  newSignature?: string;
  impactedFiles: string[];
  callSites: CallRelationship[];
  severity: 'high' | 'medium' | 'low';
  message: string;
}

export class BreakingChangeDetector {
  private indexer: CodebaseIndexer;
  
  constructor(indexer: CodebaseIndexer) {
    this.indexer = indexer;
  }
  
  /**
   * Detect breaking changes in PR
   */
  detectBreakingChanges(prSymbols: CodeSymbol[]): BreakingChange[] {
    const breakingChanges: BreakingChange[] = [];
    const index = this.indexer.getIndex();
    
    for (const prSymbol of prSymbols) {
      if (prSymbol.type !== 'method' && prSymbol.type !== 'function') continue;
      
      const existingSymbol = index.symbolMap.get(prSymbol.name);
      
      if (!existingSymbol) {
        // New symbol - not breaking
        continue;
      }
      
      // Check for signature changes
      if (prSymbol.signature && existingSymbol.signature) {
        if (prSymbol.signature !== existingSymbol.signature) {
          const callSites = this.indexer.findCallers(prSymbol.name);
          
          breakingChanges.push({
            symbol: prSymbol,
            changeType: 'signature',
            oldSignature: existingSymbol.signature,
            newSignature: prSymbol.signature,
            impactedFiles: [...new Set(callSites.map(c => c.file))],
            callSites,
            severity: callSites.length > 0 ? 'high' : 'medium',
            message: `Method signature changed: ${existingSymbol.signature} → ${prSymbol.signature}`,
          });
        }
      }
      
      // Check for visibility changes (public -> private)
      if (prSymbol.visibility && existingSymbol.visibility) {
        if (this.isVisibilityReduced(existingSymbol.visibility, prSymbol.visibility)) {
          const callSites = this.indexer.findCallers(prSymbol.name);
          
          breakingChanges.push({
            symbol: prSymbol,
            changeType: 'visibility',
            oldSignature: existingSymbol.signature,
            newSignature: prSymbol.signature,
            impactedFiles: [...new Set(callSites.map(c => c.file))],
            callSites,
            severity: 'high',
            message: `Visibility reduced: ${existingSymbol.visibility} → ${prSymbol.visibility}`,
          });
        }
      }
      
      // Check for return type changes
      if (prSymbol.returnType && existingSymbol.returnType) {
        if (prSymbol.returnType !== existingSymbol.returnType) {
          const callSites = this.indexer.findCallers(prSymbol.name);
          
          breakingChanges.push({
            symbol: prSymbol,
            changeType: 'return_type',
            oldSignature: existingSymbol.signature,
            newSignature: prSymbol.signature,
            impactedFiles: [...new Set(callSites.map(c => c.file))],
            callSites,
            severity: 'high',
            message: `Return type changed: ${existingSymbol.returnType} → ${prSymbol.returnType}`,
          });
        }
      }
    }
    
    return breakingChanges;
  }
  
  private isVisibilityReduced(old: string, new_: string): boolean {
    const visibilityLevels: Record<string, number> = {
      'public': 3,
      'protected': 2,
      'package': 1,
      'private': 0,
    };
    
    return (visibilityLevels[new_] || 0) < (visibilityLevels[old] || 0);
  }
}





