// #docplaster
// #docregion
import { Component, OnInit } from '@angular/core';

// #docregion rxjs-imports
import { Observable, Subject } from 'rxjs';

import {
   debounceTime, distinctUntilChanged, switchMap
 } from 'rxjs/operators';
// #enddocregion rxjs-imports

import { Hero } from '../hero';
import { HeroService } from '../hero.service';

@Component({
  selector: 'app-hero-search',
  templateUrl: './hero-search.component.html',
  styleUrls: [ './hero-search.component.css' ]
})
export class HeroSearchComponent implements OnInit {
  // DJK 3: Search
  //heroes$: Observable<Hero[]>;
  //private searchTerms = new Subject<string>();

  heroes$ = this.heroService.filteredHeroes$;

  constructor(private heroService: HeroService) {}

  // Push a search term into the observable stream.
  search(term: string): void {
    // DJK 3: Search
    this.heroService.search(term);
  }

  ngOnInit(): void {
      // DJK 3: Search
    // this.heroes$ = this.searchTerms.pipe(
    //   // wait 300ms after each keystroke before considering the term
    //   debounceTime(300),

    //   // ignore new term if same as previous term
    //   distinctUntilChanged(),

    //   // switch to new search observable each time the term changes
    //   switchMap((term: string) => this.heroService.searchHeroes(term)),
    // );
  }
}