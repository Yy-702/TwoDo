import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PhotoStrip } from "@/features/photos/photo-strip";
import type { SpacePhoto } from "@/features/photos/photo";

describe("PhotoStrip", () => {
  it("Photo_UI_EmptyState_And_AddButtonWorks", async () => {
    const user = userEvent.setup();
    const onSelectFile = vi.fn().mockResolvedValue(undefined);

    render(
      <PhotoStrip
        photos={[]}
        listState="ready"
        uploadingPhoto={false}
        photoError={null}
        onSelectFile={onSelectFile}
        onDeletePhoto={vi.fn().mockResolvedValue(undefined)}
        canDeletePhoto={() => false}
      />
    );

    expect(
      screen.getByText("还没有照片，点击“添加照片”上传第一张。")
    ).toBeInTheDocument();

    const addButton = screen.getByRole("button", { name: /添加照片/ });
    const fileInput = document.querySelector("input[type='file']") as HTMLInputElement;

    const file = new File(["hello"], "hello.png", { type: "image/png" });

    await user.click(addButton);
    await user.upload(fileInput, file);

    expect(onSelectFile).toHaveBeenCalledTimes(1);
    expect(onSelectFile).toHaveBeenCalledWith(file);
  });

  it("有删除权限时显示删除按钮", () => {
    const photo: SpacePhoto = {
      id: "p1",
      spaceId: "s1",
      uploadedBy: "u1",
      objectPath: "s1/u1/a.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 100,
      createdAt: "2026-01-01T00:00:00.000Z",
      publicUrl: "https://example.com/a.jpg",
    };

    render(
      <PhotoStrip
        photos={[photo]}
        listState="ready"
        uploadingPhoto={false}
        photoError={null}
        onSelectFile={vi.fn().mockResolvedValue(undefined)}
        onDeletePhoto={vi.fn().mockResolvedValue(undefined)}
        canDeletePhoto={() => true}
      />
    );

    expect(screen.getByRole("button", { name: "删除" })).toBeInTheDocument();
  });
});
