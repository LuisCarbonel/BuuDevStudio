import { Directive, Input, OnChanges } from '@angular/core';
import { CdkDrag } from '@angular/cdk/drag-drop';

@Directive({
  selector: '[appDragSource]',
  standalone: true,
  hostDirectives: [CdkDrag],
})
export class DragSourceDirective implements OnChanges {
  @Input('appDragSource') data!: unknown;
  @Input() appDragSourceDisabled = false;

  constructor(private cdkDrag: CdkDrag<unknown>) {}

  ngOnChanges(): void {
    this.cdkDrag.data = this.data;
    this.cdkDrag.disabled = this.appDragSourceDisabled;
  }
}
