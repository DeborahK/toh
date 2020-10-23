import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';

import { HeroService } from '../hero.service';

@Component({
  selector: 'app-hero-detail',
  templateUrl: './hero-detail.component.html',
  styleUrls: ['./hero-detail.component.css']
})
export class HeroDetailComponent implements OnInit {

  // DJK2 Assign to the declared Observable in the service
  hero$ = this.heroService.hero$;

  constructor(
    private route: ActivatedRoute,
    private heroService: HeroService,
    private location: Location
  ) { }

  ngOnInit(): void {
    this.getHero();
  }


  getHero(): void {
    const id = +this.route.snapshot.paramMap.get('id');
    // DJK2 Emit the selected id
    this.heroService.selectHero(id);
  }

  goBack(): void {
    this.location.back();
  }

  save(hero): void {
    this.heroService.updateHero(hero);
  }
}
